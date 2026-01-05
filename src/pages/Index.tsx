import { useState, useCallback, useRef, useEffect } from 'react';
import { Cloud } from 'lucide-react';
import logo from '@/assets/logo.png';
import { RouteInput } from '@/components/RouteInput';
import { RouteSummary } from '@/components/RouteSummary';
import { RouteMap } from '@/components/RouteMap';
import { WeatherTimeline } from '@/components/WeatherTimeline';
import { WeatherSummary } from '@/components/WeatherSummary';
import { WeatherComparisonTable } from '@/components/WeatherComparisonTable';
import { ErrorMessage } from '@/components/ErrorMessage';
import { 
  geocodeLocation, 
  getRoute, 
  calculateWaypoints, 
  getWeather,
  type Waypoint,
  type WeatherData,
  type RouteData
} from '@/lib/apiUtils';

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [weatherData, setWeatherData] = useState<Map<number, WeatherData | null>>(new Map());
  const [weatherDataOffset, setWeatherDataOffset] = useState<Map<number, WeatherData | null>>(new Map());
  const [weatherDataOffset3h, setWeatherDataOffset3h] = useState<Map<number, WeatherData | null>>(new Map());
  const [isLoading3hOffset, setIsLoading3hOffset] = useState(false);
  const [loadingStates, setLoadingStates] = useState<Map<number, boolean>>(new Map());
  const [fromName, setFromName] = useState('');
  const [toName, setToName] = useState('');
  const [departureTime, setDepartureTime] = useState<Date | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleSubmit = useCallback(async (from: string, to: string, departure: Date) => {
    setIsLoading(true);
    setError(null);
    setRouteData(null);
    setWaypoints([]);
    setWeatherData(new Map());
    setWeatherDataOffset(new Map());
    setWeatherDataOffset3h(new Map());
    setIsLoading3hOffset(false);
    setLoadingStates(new Map());
    setDepartureTime(departure);

    try {
      // Geocode both locations
      const [fromCoords, toCoords] = await Promise.all([
        geocodeLocation(from),
        geocodeLocation(to)
      ]);

      setFromName(from);
      setToName(to);

      // Get route
      const route = await getRoute(fromCoords, toCoords);
      setRouteData(route);

      // Calculate waypoints (with reverse geocoding for location names)
      const calculatedWaypoints = await calculateWaypoints(route, departure, from, to);
      
      // Initialize loading states before setting waypoints
      // so both are ready when WeatherSummary renders
      const initialLoadingStates = new Map<number, boolean>();
      calculatedWaypoints.forEach((_, index) => {
        initialLoadingStates.set(index, true);
      });
      
      // Batch state updates together
      setLoadingStates(initialLoadingStates);
      setWaypoints(calculatedWaypoints);
      setIsLoading(false);
      
      // Scroll to results after data is loaded, accounting for sticky header
      setTimeout(() => {
        if (resultsRef.current) {
          const headerHeight = 85; // Approximate header height
          const elementPosition = resultsRef.current.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: elementPosition - headerHeight, behavior: 'smooth' });
        }
      }, 100);

      // Fetch weather for each waypoint (current time and +1 hour offset)
      calculatedWaypoints.forEach(async (waypoint, index) => {
        try {
          const weather = await getWeather(waypoint.lat, waypoint.lon, waypoint.arrivalTime);
          setWeatherData(prev => new Map(prev).set(index, weather));
        } catch (err) {
          console.error(`Failed to fetch weather for waypoint ${index}:`, err);
          setWeatherData(prev => new Map(prev).set(index, null));
        } finally {
          setLoadingStates(prev => new Map(prev).set(index, false));
        }
        
        // Also fetch weather for +1 hour offset for comparison
        try {
          const offsetTime = new Date(waypoint.arrivalTime.getTime() + 60 * 60 * 1000);
          const weatherOffset = await getWeather(waypoint.lat, waypoint.lon, offsetTime);
          setWeatherDataOffset(prev => new Map(prev).set(index, weatherOffset));
        } catch (err) {
          console.error(`Failed to fetch offset weather for waypoint ${index}:`, err);
          setWeatherDataOffset(prev => new Map(prev).set(index, null));
        }
      });

    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  }, []);

  const fetch3hOffsetWeather = useCallback(async (waypointList: Waypoint[]) => {
    setIsLoading3hOffset(true);
    setWeatherDataOffset3h(new Map());
    
    await Promise.all(waypointList.map(async (waypoint, index) => {
      try {
        const offsetTime = new Date(waypoint.arrivalTime.getTime() + 3 * 60 * 60 * 1000);
        const weather = await getWeather(waypoint.lat, waypoint.lon, offsetTime);
        setWeatherDataOffset3h(prev => new Map(prev).set(index, weather));
      } catch (err) {
        console.error(`Failed to fetch 3h offset weather for waypoint ${index}:`, err);
        setWeatherDataOffset3h(prev => new Map(prev).set(index, null));
      }
    }));
    
    setIsLoading3hOffset(false);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg overflow-hidden">
              <img src={logo} alt="Route Weather Planner" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">WeatherWay</h1>
              <p className="text-sm text-muted-foreground">Plan your road trip with dynamic weather forecasts for locations along your route</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        <RouteInput onSubmit={handleSubmit} isLoading={isLoading} />
        
        {error && (
          <ErrorMessage 
            title="Error" 
            message={error}
            onRetry={() => setError(null)}
          />
        )}
        
        {(routeData && departureTime) || isLoading ? (
          <div ref={resultsRef}>
            {routeData && departureTime && (
              <RouteSummary
                distance={routeData.distance}
                duration={routeData.duration}
                departureTime={departureTime}
                fromName={fromName}
                toName={toName}
              />
            )}
            
            <WeatherSummary
              waypoints={waypoints}
              weatherData={weatherData}
              weatherDataOffset={weatherDataOffset}
              weatherDataOffset3h={weatherDataOffset3h}
              isLoading3hOffset={isLoading3hOffset}
              onRequest3hCheck={fetch3hOffsetWeather}
              loadingStates={loadingStates}
              isCalculatingRoute={isLoading && waypoints.length === 0}
            />
            
            {routeData && (
              <RouteMap
                routeGeometry={routeData.geometry}
                waypoints={waypoints}
                weatherData={weatherData}
              />
            )}
          </div>
        ) : null}
        
        {waypoints.length > 0 && (
          <WeatherTimeline
            waypoints={waypoints}
            weatherData={weatherData}
            loadingStates={loadingStates}
          />
        )}
        
        {waypoints.length > 0 && (
          <WeatherComparisonTable
            waypoints={waypoints}
            weatherData={weatherData}
            weatherDataOffset={weatherDataOffset}
            weatherDataOffset3h={weatherDataOffset3h}
            isLoading3hOffset={isLoading3hOffset}
          />
        )}
        
        {!routeData && !isLoading && !error && (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
            <div className="h-20 w-20 mb-4">
              <img src={logo} alt="WeatherWay" className="h-full w-full object-contain" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Plan Your Journey
            </h2>
            <p className="text-muted-foreground max-w-md">
              Enter your departure and destination to see weather conditions 
              along your route. Perfect for planning road trips across Sweden.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-4">
          <p className="text-center text-sm text-muted-foreground">
            Weather data from SMHI & Open-Meteo • Route data from OSRM • Geocoding by Nominatim & Komoot Photon
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
