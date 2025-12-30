import { AlertTriangle, CheckCircle, CloudSun, Sunrise, Sunset } from 'lucide-react';
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

const isDifficultConditions = (weather: WeatherData): boolean => {
  return (
    weather.windSpeed > 10 ||
    weather.visibility < 10 ||
    weather.precipitationIntensity > 1 ||
    weather.temperature < 0 ||
    weather.weatherSymbol >= 10
  );
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

interface DaylightEvent {
  type: 'sunrise' | 'sunset';
  time: Date;
  minutesFromStart: number;
  location: string;
}

const findDaylightEvents = (
  waypoints: Waypoint[],
  weatherData: Map<number, WeatherData | null>,
  startTime: Date
): DaylightEvent[] => {
  const events: DaylightEvent[] = [];
  const seenEvents = new Set<string>();
  
  waypoints.forEach((waypoint, index) => {
    const weather = weatherData.get(index);
    if (!weather) return;
    
    const tripStart = startTime.getTime();
    const tripEnd = waypoints[waypoints.length - 1].arrivalTime.getTime();
    
    // Check sunrise
    if (weather.sunrise) {
      const sunriseTime = weather.sunrise.getTime();
      const key = `sunrise-${weather.sunrise.toISOString().split('T')[0]}`;
      if (sunriseTime >= tripStart && sunriseTime <= tripEnd && !seenEvents.has(key)) {
        seenEvents.add(key);
        events.push({
          type: 'sunrise',
          time: weather.sunrise,
          minutesFromStart: (sunriseTime - tripStart) / (1000 * 60),
          location: waypoint.name
        });
      }
    }
    
    // Check sunset
    if (weather.sunset) {
      const sunsetTime = weather.sunset.getTime();
      const key = `sunset-${weather.sunset.toISOString().split('T')[0]}`;
      if (sunsetTime >= tripStart && sunsetTime <= tripEnd && !seenEvents.has(key)) {
        seenEvents.add(key);
        events.push({
          type: 'sunset',
          time: weather.sunset,
          minutesFromStart: (sunsetTime - tripStart) / (1000 * 60),
          location: waypoint.name
        });
      }
    }
  });
  
  return events.sort((a, b) => a.minutesFromStart - b.minutesFromStart);
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const isDaytime = (time: Date, sunrise: Date | null, sunset: Date | null): boolean => {
  if (!sunrise || !sunset) return true; // Assume daytime if no data
  const t = time.getTime();
  return t >= sunrise.getTime() && t <= sunset.getTime();
};

interface NarrativeLine {
  text: string;
  isDifficult: boolean;
}

const generateNarrative = (
  waypoints: Waypoint[],
  weatherData: Map<number, WeatherData | null>
): NarrativeLine[] => {
  const narrative: NarrativeLine[] = [];
  
  if (waypoints.length < 2) return narrative;

  const startTime = waypoints[0].arrivalTime;
  const endTime = waypoints[waypoints.length - 1].arrivalTime;
  
  // Get daylight events
  const daylightEvents = findDaylightEvents(waypoints, weatherData, startTime);
  
  // Check initial daylight status
  const firstWeather = weatherData.get(0);
  const startsDuringDay = firstWeather ? isDaytime(startTime, firstWeather.sunrise, firstWeather.sunset) : true;

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

  // Add initial daylight context
  if (!startsDuringDay) {
    narrative.push({ text: '🌙 You\'ll be starting your journey in darkness.', isDifficult: false });
  }

  // Generate narrative for each segment
  segments.forEach((segment, index) => {
    const icon = getWeatherIcon(segment.weather.weatherSymbol);
    const conditions = describeConditions(segment.weather);
    const difficult = isDifficultConditions(segment.weather);
    
    if (index === 0) {
      // First segment
      if (segments.length === 1) {
        narrative.push({ text: `${icon} Throughout your journey, expect ${conditions}. Conditions remain consistent all the way to your destination.`, isDifficult: difficult });
      } else {
        const duration = formatDuration(segment.endMinutes - segment.startMinutes);
        if (segment.endMinutes < 30) {
          narrative.push({ text: `${icon} Your trip begins with ${conditions}.`, isDifficult: difficult });
        } else {
          narrative.push({ text: `${icon} The first ${duration} of your trip will see ${conditions}.`, isDifficult: difficult });
        }
      }
    } else if (index === segments.length - 1) {
      // Last segment - arrival
      const locationRef = formatLocationWithTime(segment.endLocation, segment.startMinutes);
      narrative.push({ text: `${icon} As you approach ${locationRef}, expect ${conditions}.`, isDifficult: difficult });
    } else {
      // Middle segments
      const locationRef = formatLocationWithTime(segment.startLocation, segment.startMinutes);
      narrative.push({ text: `${icon} After ${locationRef}, the weather will change to ${conditions}.`, isDifficult: difficult });
    }
    
    // Add daylight events that occur during this segment
    daylightEvents.forEach(event => {
      if (event.minutesFromStart >= segment.startMinutes && 
          (index === segments.length - 1 || event.minutesFromStart < segments[index + 1]?.startMinutes)) {
        const timeStr = formatTime(event.time);
        const locationRef = isUnnamedLocation(event.location) 
          ? `around ${formatDuration(event.minutesFromStart)} into your trip`
          : `near ${event.location}`;
        
        if (event.type === 'sunrise') {
          narrative.push({ text: `🌅 Sunrise at ${timeStr} ${locationRef}. Daylight driving conditions ahead.`, isDifficult: false });
        } else {
          narrative.push({ text: `🌇 Sunset at ${timeStr} ${locationRef}. You'll continue in darkness after this.`, isDifficult: false });
        }
      }
    });
  });

  // Add arrival summary
  const lastWeather = weatherData.get(waypoints.length - 1);
  const lastWaypoint = waypoints[waypoints.length - 1];
  if (lastWeather && lastWaypoint) {
    const icon = getWeatherIcon(lastWeather.weatherSymbol);
    const temp = lastWeather.temperature.toFixed(0);
    const arrivalDaylight = isDaytime(endTime, lastWeather.sunrise, lastWeather.sunset);
    const daylightNote = arrivalDaylight ? '' : ' It will be dark when you arrive.';
    const difficult = isDifficultConditions(lastWeather);
    narrative.push({ text: `${icon} At your destination (${lastWaypoint.name}), it will be ${temp}°C with ${getWeatherDescription(lastWeather.weatherSymbol).toLowerCase()}.${daylightNote}`, isDifficult: difficult });
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
            {narrative.map((item, index) => (
              <p key={index} className="text-sm text-muted-foreground leading-relaxed flex items-start gap-1">
                <span>{item.text}</span>
                {item.isDifficult && <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />}
              </p>
            ))}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};
