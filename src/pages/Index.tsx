import { useState, useCallback, useRef } from 'react';
import logo from '@/assets/logo.png';
import { RouteInput } from '@/components/RouteInput';
import { RouteSummary } from '@/components/RouteSummary';
import { RouteMap } from '@/components/RouteMap';
import { WeatherTimeline } from '@/components/WeatherTimeline';
import { WeatherSummary } from '@/components/WeatherSummary';
import { WeatherComparisonTable } from '@/components/WeatherComparisonTable';
import { ErrorMessage } from '@/components/ErrorMessage';
import { AdUnit } from '@/components/AdUnit';
import { LoadingSplash } from '@/components/LoadingSplash';
import { geocodeLocation, getRoute, calculateWaypoints, getWeather, type Waypoint, type WeatherData, type RouteData } from '@/lib/apiUtils';
import { calculateTripAverageScore } from '@/lib/drivingScore';
const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'idle' | 'route' | 'weather' | 'preparing'>('idle');
  const [weatherProgress, setWeatherProgress] = useState({
    current: 0,
    total: 0
  });
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
    setLoadingStage('route');
    setWeatherProgress({
      current: 0,
      total: 0
    });
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
      const [fromCoords, toCoords] = await Promise.all([geocodeLocation(from), geocodeLocation(to)]);
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
        initialLoadingStates.set(index, false); // Will be set to loaded after weather fetch
      });
      setLoadingStates(initialLoadingStates);

      // Switch to weather fetching stage
      setLoadingStage('weather');
      setWeatherProgress({
        current: 0,
        total: calculatedWaypoints.length
      });

      // Fetch all weather data in parallel and wait for completion
      const weatherResults = await Promise.all(calculatedWaypoints.map(async (waypoint, index) => {
        try {
          const weather = await getWeather(waypoint.lat, waypoint.lon, waypoint.arrivalTime);
          setWeatherProgress(prev => ({
            ...prev,
            current: prev.current + 1
          }));
          return {
            index,
            weather,
            error: null
          };
        } catch (err) {
          console.error(`Failed to fetch weather for waypoint ${index}:`, err);
          setWeatherProgress(prev => ({
            ...prev,
            current: prev.current + 1
          }));
          return {
            index,
            weather: null,
            error: err
          };
        }
      }));

      // Build the weather data map from results
      const newWeatherData = new Map<number, WeatherData | null>();
      weatherResults.forEach(result => {
        newWeatherData.set(result.index, result.weather);
      });
      setWeatherData(newWeatherData);

      // Calculate trip score to determine if we need alternative time comparisons
      const tripScore = calculateTripAverageScore(newWeatherData);

      // Only fetch offset weather if conditions aren't already excellent (score > 90)
      if (tripScore === null || tripScore <= 90) {
        // Fetch offset weather data in parallel (for comparison)
        const offsetResults = await Promise.all(calculatedWaypoints.map(async (waypoint, index) => {
          try {
            const offsetTime = new Date(waypoint.arrivalTime.getTime() + 60 * 60 * 1000);
            const weatherOffset = await getWeather(waypoint.lat, waypoint.lon, offsetTime);
            return {
              index,
              weather: weatherOffset
            };
          } catch (err) {
            console.error(`Failed to fetch offset weather for waypoint ${index}:`, err);
            return {
              index,
              weather: null
            };
          }
        }));

        // Build the offset weather data map
        const newWeatherDataOffset = new Map<number, WeatherData | null>();
        offsetResults.forEach(result => {
          newWeatherDataOffset.set(result.index, result.weather);
        });
        setWeatherDataOffset(newWeatherDataOffset);
      }
      // If score > 90, skip offset fetching - conditions are already excellent!

      // Preparing stage - brief transition
      setLoadingStage('preparing');

      // Small delay for visual feedback before showing results
      await new Promise(resolve => setTimeout(resolve, 300));

      // All done - show results
      setLoadingStage('idle');
      setIsLoading(false);

      // Scroll to results after data is loaded
      setTimeout(() => {
        if (resultsRef.current) {
          const headerHeight = 85;
          const elementPosition = resultsRef.current.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({
            top: elementPosition - headerHeight,
            behavior: 'smooth'
          });
        }
      }, 100);
    } catch (err) {
      setLoadingStage('idle');
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
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg overflow-hidden">
              <img src={logo} alt="Route Weather Planner" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">DriveSafer</h1>
              <p className="text-sm text-muted-foreground">Plan your road trip with dynamic weather forecasts for locations along your route</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        <RouteInput onSubmit={handleSubmit} isLoading={isLoading} />
        
        {error && <ErrorMessage title="Error" message={error} onRetry={() => setError(null)} />}
        
        {/* Loading Splash Screen */}
        {isLoading && loadingStage !== 'idle' && <LoadingSplash stage={loadingStage as 'route' | 'weather' | 'preparing'} progress={weatherProgress} />}
        
        {/* Results - only show when not loading */}
        {!isLoading && routeData && departureTime && <div ref={resultsRef}>
            <RouteSummary distance={routeData.distance} duration={routeData.duration} departureTime={departureTime} fromName={fromName} toName={toName} />
            
            <WeatherSummary waypoints={waypoints} weatherData={weatherData} weatherDataOffset={weatherDataOffset} weatherDataOffset3h={weatherDataOffset3h} isLoading3hOffset={isLoading3hOffset} onRequest3hCheck={fetch3hOffsetWeather} loadingStates={loadingStates} isCalculatingRoute={false} />
            
            <RouteMap routeGeometry={routeData.geometry} waypoints={waypoints} weatherData={weatherData} />
          </div>}
        
        {!isLoading && waypoints.length > 0 && <WeatherTimeline waypoints={waypoints} weatherData={weatherData} loadingStates={loadingStates} />}
        
        {!isLoading && waypoints.length > 0 && <WeatherComparisonTable waypoints={waypoints} weatherData={weatherData} weatherDataOffset={weatherDataOffset} weatherDataOffset3h={weatherDataOffset3h} isLoading3hOffset={isLoading3hOffset} />}
        
      </main>

      {/* Ad placements */}
      <div className="container mx-auto px-4 py-4 space-y-4">
        <AdUnit slot="6863267062" format="horizontal" />
        <AdUnit slot="6863267062" format="horizontal" />
      </div>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-4">
          <p className="text-center text-sm text-muted-foreground">Weather data from SMHI & Open-Meteo • Route data from OSRM • Geocoding by Nominatim & Komoot Photon  • Created by Pasheman Studios</p>
        </div>
      </footer>
    </div>;
};
export default Index;