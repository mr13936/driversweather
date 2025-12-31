import { useState, useCallback, useRef, useEffect } from 'react';
import { Cloud } from 'lucide-react';
import logo from '@/assets/logo.png';
import { RouteInput } from '@/components/RouteInput';
import { RouteSummary } from '@/components/RouteSummary';
import { RouteMap } from '@/components/RouteMap';
import { WeatherTimeline } from '@/components/WeatherTimeline';
import { WeatherSummary } from '@/components/WeatherSummary';
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
      setWaypoints(calculatedWaypoints);

      // Initialize loading states
      const initialLoadingStates = new Map<number, boolean>();
      calculatedWaypoints.forEach((_, index) => {
        initialLoadingStates.set(index, true);
      });
      setLoadingStates(initialLoadingStates);

      setIsLoading(false);
      
      // Scroll to results after data is loaded, accounting for sticky header
      setTimeout(() => {
        if (resultsRef.current) {
          const headerHeight = 80; // Approximate header height
          const elementPosition = resultsRef.current.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: elementPosition - headerHeight, behavior: 'smooth' });
        }
      }, 100);

      // Fetch weather for each waypoint
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
      });

    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
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
              <p className="text-sm text-muted-foreground">Plan your road trip with weather forecasts</p>
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
        
        {routeData && departureTime && (
          <div ref={resultsRef}>
            <RouteSummary
              distance={routeData.distance}
              duration={routeData.duration}
              departureTime={departureTime}
              fromName={fromName}
              toName={toName}
            />
            
            <WeatherSummary
              waypoints={waypoints}
              weatherData={weatherData}
            />
            
            <RouteMap
              routeGeometry={routeData.geometry}
              waypoints={waypoints}
              weatherData={weatherData}
            />
          </div>
        )}
        
        {waypoints.length > 0 && (
          <WeatherTimeline
            waypoints={waypoints}
            weatherData={weatherData}
            loadingStates={loadingStates}
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
            Weather data from SMHI • Route data from OSRM • Geocoding by Nominatim
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
