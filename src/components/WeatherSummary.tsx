import { AlertTriangle, CheckCircle, CloudRain, Wind, Eye, Thermometer } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { WeatherData, Waypoint } from '@/lib/apiUtils';
import { getWeatherIcon, getWeatherDescription } from '@/lib/weatherUtils';

interface WeatherSummaryProps {
  waypoints: Waypoint[];
  weatherData: Map<number, WeatherData | null>;
}

interface WorstConditions {
  lowestTemp: { value: number; location: string } | null;
  highestWind: { value: number; location: string } | null;
  lowestVisibility: { value: number; location: string } | null;
  heaviestPrecip: { value: number; location: string } | null;
  worstWeather: { symbol: number; location: string } | null;
}

const analyzeConditions = (
  waypoints: Waypoint[],
  weatherData: Map<number, WeatherData | null>
): WorstConditions => {
  const conditions: WorstConditions = {
    lowestTemp: null,
    highestWind: null,
    lowestVisibility: null,
    heaviestPrecip: null,
    worstWeather: null,
  };

  waypoints.forEach((waypoint, index) => {
    const weather = weatherData.get(index);
    if (!weather) return;

    if (!conditions.lowestTemp || weather.temperature < conditions.lowestTemp.value) {
      conditions.lowestTemp = { value: weather.temperature, location: waypoint.name };
    }

    if (!conditions.highestWind || weather.windSpeed > conditions.highestWind.value) {
      conditions.highestWind = { value: weather.windSpeed, location: waypoint.name };
    }

    if (!conditions.lowestVisibility || weather.visibility < conditions.lowestVisibility.value) {
      conditions.lowestVisibility = { value: weather.visibility, location: waypoint.name };
    }

    if (!conditions.heaviestPrecip || weather.precipitationIntensity > conditions.heaviestPrecip.value) {
      conditions.heaviestPrecip = { value: weather.precipitationIntensity, location: waypoint.name };
    }

    // Higher weather symbols generally mean worse conditions
    if (!conditions.worstWeather || weather.weatherSymbol > conditions.worstWeather.symbol) {
      conditions.worstWeather = { symbol: weather.weatherSymbol, location: waypoint.name };
    }
  });

  return conditions;
};

const hasWarnings = (conditions: WorstConditions): boolean => {
  return (
    (conditions.highestWind?.value ?? 0) > 10 ||
    (conditions.lowestVisibility?.value ?? 50) < 10 ||
    (conditions.heaviestPrecip?.value ?? 0) > 1 ||
    (conditions.lowestTemp?.value ?? 20) < 0
  );
};

export const WeatherSummary = ({ waypoints, weatherData }: WeatherSummaryProps) => {
  const loadedCount = Array.from(weatherData.values()).filter(w => w !== null).length;
  
  if (loadedCount === 0) return null;

  const conditions = analyzeConditions(waypoints, weatherData);
  const showWarning = hasWarnings(conditions);

  return (
    <Alert 
      variant={showWarning ? "destructive" : "default"} 
      className="animate-fade-in"
    >
      {showWarning ? (
        <AlertTriangle className="h-4 w-4" />
      ) : (
        <CheckCircle className="h-4 w-4" />
      )}
      <AlertTitle className="font-semibold">
        {showWarning ? 'Weather Advisory' : 'Good Driving Conditions'}
      </AlertTitle>
      <AlertDescription>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {conditions.lowestTemp && (
            <div className="flex items-center gap-2 text-sm">
              <Thermometer className="h-4 w-4 flex-shrink-0" />
              <span>
                Low: <strong>{conditions.lowestTemp.value.toFixed(0)}°C</strong>
                <span className="text-muted-foreground ml-1">at {conditions.lowestTemp.location}</span>
              </span>
            </div>
          )}
          
          {conditions.highestWind && conditions.highestWind.value > 5 && (
            <div className="flex items-center gap-2 text-sm">
              <Wind className="h-4 w-4 flex-shrink-0" />
              <span>
                Wind: <strong>{conditions.highestWind.value.toFixed(0)} m/s</strong>
                <span className="text-muted-foreground ml-1">at {conditions.highestWind.location}</span>
              </span>
            </div>
          )}
          
          {conditions.lowestVisibility && conditions.lowestVisibility.value < 20 && (
            <div className="flex items-center gap-2 text-sm">
              <Eye className="h-4 w-4 flex-shrink-0" />
              <span>
                Visibility: <strong>{conditions.lowestVisibility.value.toFixed(0)} km</strong>
                <span className="text-muted-foreground ml-1">at {conditions.lowestVisibility.location}</span>
              </span>
            </div>
          )}
          
          {conditions.heaviestPrecip && conditions.heaviestPrecip.value > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <CloudRain className="h-4 w-4 flex-shrink-0" />
              <span>
                Precip: <strong>{conditions.heaviestPrecip.value.toFixed(1)} mm/h</strong>
                <span className="text-muted-foreground ml-1">at {conditions.heaviestPrecip.location}</span>
              </span>
            </div>
          )}
          
          {conditions.worstWeather && (
            <div className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-4">
              <span className="text-base">{getWeatherIcon(conditions.worstWeather.symbol)}</span>
              <span>
                Expect <strong>{getWeatherDescription(conditions.worstWeather.symbol)}</strong>
                <span className="text-muted-foreground ml-1">near {conditions.worstWeather.location}</span>
              </span>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};
