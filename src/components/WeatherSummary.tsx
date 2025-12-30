import { AlertTriangle, CheckCircle, CloudSun } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { WeatherData, Waypoint } from '@/lib/apiUtils';
import { getWeatherIcon, getWeatherDescription } from '@/lib/weatherUtils';

interface WeatherSummaryProps {
  waypoints: Waypoint[];
  weatherData: Map<number, WeatherData | null>;
}

type SeverityLevel = 'good' | 'caution' | 'warning';

const assessOverallSeverity = (
  waypoints: Waypoint[],
  weatherData: Map<number, WeatherData | null>
): SeverityLevel => {
  let hasWarning = false;
  let hasCaution = false;

  waypoints.forEach((_, index) => {
    const weather = weatherData.get(index);
    if (!weather) return;

    // Warning conditions
    if (
      weather.windSpeed > 15 ||
      weather.visibility < 5 ||
      weather.precipitationIntensity > 3 ||
      weather.temperature < -10 ||
      weather.weatherSymbol >= 20 // Heavy rain/snow/thunder
    ) {
      hasWarning = true;
    }
    // Caution conditions
    else if (
      weather.windSpeed > 10 ||
      weather.visibility < 10 ||
      weather.precipitationIntensity > 1 ||
      weather.temperature < 0 ||
      weather.weatherSymbol >= 10 // Light rain/snow
    ) {
      hasCaution = true;
    }
  });

  if (hasWarning) return 'warning';
  if (hasCaution) return 'caution';
  return 'good';
};

const getOverallMessage = (severity: SeverityLevel): string => {
  switch (severity) {
    case 'good':
      return 'No extreme weather expected for your trip. Conditions look favorable for driving.';
    case 'caution':
      return 'Some potential weather concerns along your route. Drive with care.';
    case 'warning':
      return 'Expect some difficult weather conditions. Consider adjusting your travel plans if possible.';
  }
};

const describeConditions = (weather: WeatherData): string => {
  const conditions: string[] = [];
  
  const weatherDesc = getWeatherDescription(weather.weatherSymbol).toLowerCase();
  conditions.push(weatherDesc);
  
  if (weather.temperature < -5) {
    conditions.push(`very cold (${weather.temperature.toFixed(0)}°C)`);
  } else if (weather.temperature < 0) {
    conditions.push(`cold (${weather.temperature.toFixed(0)}°C)`);
  } else if (weather.temperature > 30) {
    conditions.push(`hot (${weather.temperature.toFixed(0)}°C)`);
  }
  
  if (weather.windSpeed > 15) {
    conditions.push('strong winds');
  } else if (weather.windSpeed > 10) {
    conditions.push('moderate winds');
  }
  
  if (weather.visibility < 5) {
    conditions.push('reduced visibility');
  }
  
  if (weather.precipitationIntensity > 3) {
    conditions.push('heavy precipitation');
  } else if (weather.precipitationIntensity > 1) {
    conditions.push('light precipitation');
  }
  
  return conditions.join(', ');
};

const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${Math.round(minutes)} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  return hours === 1 ? `1 hour ${mins} min` : `${hours} hours ${mins} min`;
};

const getMinutesFromStart = (waypoint: Waypoint, startTime: Date): number => {
  return (waypoint.arrivalTime.getTime() - startTime.getTime()) / (1000 * 60);
};

const isUnnamedLocation = (name: string): boolean => {
  const unnamed = ['unnamed road', 'en route', 'unnamed', ''];
  return unnamed.includes(name.toLowerCase().trim());
};

const formatLocationWithTime = (location: string, minutes: number): string => {
  const timeStr = formatDuration(minutes);
  if (isUnnamedLocation(location)) {
    return `around ${timeStr} into your trip`;
  }
  return `${location} (${timeStr} in)`;
};

const generateNarrative = (
  waypoints: Waypoint[],
  weatherData: Map<number, WeatherData | null>
): string[] => {
  const narrative: string[] = [];
  
  if (waypoints.length < 2) return narrative;

  const startTime = waypoints[0].arrivalTime;

  // Group waypoints by similar weather conditions
  interface WeatherSegment {
    startIndex: number;
    endIndex: number;
    startMinutes: number;
    endMinutes: number;
    weather: WeatherData;
    startLocation: string;
    endLocation: string;
  }

  const segments: WeatherSegment[] = [];
  let currentSegment: WeatherSegment | null = null;

  waypoints.forEach((waypoint, index) => {
    const weather = weatherData.get(index);
    if (!weather) return;

    const minutesFromStart = getMinutesFromStart(waypoint, startTime);

    const shouldStartNewSegment = !currentSegment || 
      Math.abs(weather.weatherSymbol - currentSegment.weather.weatherSymbol) > 3 ||
      Math.abs(weather.precipitationIntensity - currentSegment.weather.precipitationIntensity) > 1 ||
      Math.abs(weather.temperature - currentSegment.weather.temperature) > 5;

    if (shouldStartNewSegment) {
      if (currentSegment) {
        segments.push(currentSegment);
      }
      currentSegment = {
        startIndex: index,
        endIndex: index,
        startMinutes: minutesFromStart,
        endMinutes: minutesFromStart,
        weather,
        startLocation: waypoint.name,
        endLocation: waypoint.name,
      };
    } else if (currentSegment) {
      currentSegment.endIndex = index;
      currentSegment.endMinutes = minutesFromStart;
      currentSegment.endLocation = waypoint.name;
    }
  });

  if (currentSegment) {
    segments.push(currentSegment);
  }

  // Generate narrative for each segment
  segments.forEach((segment, index) => {
    const icon = getWeatherIcon(segment.weather.weatherSymbol);
    const conditions = describeConditions(segment.weather);
    
    if (index === 0) {
      // First segment
      if (segments.length === 1) {
        narrative.push(`${icon} Throughout your journey, expect ${conditions}. Conditions remain consistent all the way to your destination.`);
      } else {
        const duration = formatDuration(segment.endMinutes - segment.startMinutes);
        if (segment.endMinutes < 30) {
          narrative.push(`${icon} Your trip begins with ${conditions}.`);
        } else {
          narrative.push(`${icon} The first ${duration} of your trip will see ${conditions}.`);
        }
      }
    } else if (index === segments.length - 1) {
      // Last segment - arrival
      const locationRef = formatLocationWithTime(segment.endLocation, segment.startMinutes);
      narrative.push(`${icon} As you approach ${locationRef}, expect ${conditions}.`);
    } else {
      // Middle segments
      const locationRef = formatLocationWithTime(segment.startLocation, segment.startMinutes);
      narrative.push(`${icon} After ${locationRef}, the weather will change to ${conditions}.`);
    }
  });

  // Add arrival summary
  const lastWeather = weatherData.get(waypoints.length - 1);
  const lastWaypoint = waypoints[waypoints.length - 1];
  if (lastWeather && lastWaypoint) {
    const icon = getWeatherIcon(lastWeather.weatherSymbol);
    const temp = lastWeather.temperature.toFixed(0);
    narrative.push(`${icon} At your destination (${lastWaypoint.name}), it will be ${temp}°C with ${getWeatherDescription(lastWeather.weatherSymbol).toLowerCase()}.`);
  }

  return narrative;
};

export const WeatherSummary = ({ waypoints, weatherData }: WeatherSummaryProps) => {
  const loadedCount = Array.from(weatherData.values()).filter(w => w !== null).length;
  
  if (loadedCount === 0) return null;

  const severity = assessOverallSeverity(waypoints, weatherData);
  const overallMessage = getOverallMessage(severity);
  const narrative = generateNarrative(waypoints, weatherData);

  const getIcon = () => {
    switch (severity) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'caution':
        return <CloudSun className="h-5 w-5" />;
      case 'good':
        return <CheckCircle className="h-5 w-5" />;
    }
  };

  const getTitle = () => {
    switch (severity) {
      case 'warning':
        return 'Weather Alert';
      case 'caution':
        return 'Weather Advisory';
      case 'good':
        return 'Weather Overview';
    }
  };

  return (
    <Alert 
      variant={severity === 'warning' ? 'destructive' : 'default'} 
      className="animate-fade-in"
    >
      {getIcon()}
      <AlertTitle className="font-semibold text-base">
        {getTitle()}
      </AlertTitle>
      <AlertDescription>
        <p className="mt-1 text-sm font-medium">{overallMessage}</p>
        
        {narrative.length > 0 && (
          <div className="mt-3 space-y-2">
            {narrative.map((paragraph, index) => (
              <p key={index} className="text-sm text-muted-foreground leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};
