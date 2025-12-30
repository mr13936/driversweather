import { AlertTriangle, CheckCircle, CloudSun, Sunrise, Sunset } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { WeatherData, Waypoint } from '@/lib/apiUtils';
import { getWeatherIcon, getWeatherDescription } from '@/lib/weatherUtils';

interface WeatherSummaryProps {
  waypoints: Waypoint[];
  weatherData: Map<number, WeatherData | null>;
}

type SeverityLevel = 'good' | 'caution' | 'warning';

interface TripAssessment {
  severity: SeverityLevel;
  isLongTrip: boolean;
  hasMixedConditions: boolean;
  warningCount: number;
  cautionCount: number;
  totalPoints: number;
}

const assessTrip = (
  waypoints: Waypoint[],
  weatherData: Map<number, WeatherData | null>
): TripAssessment => {
  let warningCount = 0;
  let cautionCount = 0;
  let totalPoints = 0;
  let hasPrecipitation = false;
  let hasClearWeather = false;

  waypoints.forEach((_, index) => {
    const weather = weatherData.get(index);
    if (!weather) return;
    totalPoints++;

    // Focus primarily on precipitation for driving conditions
    const hasDangerousPrecipitation = weather.precipitationIntensity > 4 || 
      (weather.weatherSymbol >= 20 && weather.weatherSymbol <= 27); // Heavy rain/snow/thunder
    
    const hasModeratePrecipitation = weather.precipitationIntensity > 2 ||
      (weather.weatherSymbol >= 10 && weather.weatherSymbol <= 19); // Moderate rain/snow
    
    const hasLightPrecipitation = weather.precipitationIntensity > 0.5 ||
      (weather.weatherSymbol >= 8 && weather.weatherSymbol < 10);

    // Track if there's precipitation or clear weather
    if (hasDangerousPrecipitation || hasModeratePrecipitation || hasLightPrecipitation) {
      hasPrecipitation = true;
    }
    if (weather.precipitationIntensity < 0.5 && weather.weatherSymbol < 8) {
      hasClearWeather = true;
    }

    // Warning: Only for actually dangerous driving conditions
    if (
      hasDangerousPrecipitation ||
      weather.visibility < 3 ||
      weather.windSpeed > 20
    ) {
      warningCount++;
    }
    // Caution: Moderate precipitation or notably reduced visibility
    else if (
      hasModeratePrecipitation ||
      weather.visibility < 5 ||
      weather.windSpeed > 15
    ) {
      cautionCount++;
    }
    // Note: Cold weather alone (even below 0) is NOT a caution - roads are treated in winter
  });

  // Calculate trip duration in hours
  const tripDurationMs = waypoints.length >= 2 
    ? waypoints[waypoints.length - 1].arrivalTime.getTime() - waypoints[0].arrivalTime.getTime()
    : 0;
  const tripDurationHours = tripDurationMs / (1000 * 60 * 60);
  const isLongTrip = tripDurationHours > 3;
  const hasMixedConditions = hasPrecipitation && hasClearWeather;

  // Determine overall severity based on proportion of bad conditions
  let severity: SeverityLevel = 'good';
  
  if (warningCount > 0) {
    // Only warning if significant portion has dangerous conditions
    severity = warningCount >= totalPoints * 0.3 ? 'warning' : 'caution';
  } else if (cautionCount > 0) {
    // Only caution if moderate precipitation affects a notable portion
    severity = cautionCount >= totalPoints * 0.4 ? 'caution' : 'good';
  }

  return { severity, isLongTrip, hasMixedConditions, warningCount, cautionCount, totalPoints };
};

const getOverallMessage = (assessment: TripAssessment): string => {
  const { severity, isLongTrip, hasMixedConditions, warningCount, totalPoints } = assessment;

  if (severity === 'good') {
    if (isLongTrip) {
      return 'Good driving conditions expected throughout your journey. No significant weather disruptions forecast.';
    }
    return 'Conditions look favorable for driving. Have a safe trip!';
  }

  if (severity === 'caution') {
    if (isLongTrip && hasMixedConditions) {
      return 'Your route passes through varying weather. Expect some precipitation along parts of the journey, but conditions are manageable overall.';
    }
    if (hasMixedConditions) {
      return 'Some precipitation expected along parts of your route. Conditions are mostly manageable.';
    }
    return 'Some precipitation expected. Drive with care.';
  }

  // Warning severity
  if (isLongTrip && hasMixedConditions) {
    const badPortion = Math.round((warningCount / totalPoints) * 100);
    return `Expect challenging weather for about ${badPortion}% of your route. Consider timing your departure to avoid the worst conditions.`;
  }
  return 'Significant precipitation expected. Allow extra time and drive carefully.';
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

type ConditionSeverity = 'none' | 'caution' | 'severe';

const getConditionSeverity = (weather: WeatherData): ConditionSeverity => {
  // Severe conditions - focus on precipitation and visibility
  if (
    weather.precipitationIntensity > 4 ||
    weather.visibility < 3 ||
    weather.windSpeed > 20 ||
    (weather.weatherSymbol >= 20 && weather.weatherSymbol <= 27) // Heavy rain/snow/thunder
  ) {
    return 'severe';
  }
  
  // Caution conditions - moderate precipitation
  if (
    weather.precipitationIntensity > 2 ||
    weather.visibility < 5 ||
    weather.windSpeed > 15 ||
    (weather.weatherSymbol >= 10 && weather.weatherSymbol <= 19) // Moderate rain/snow
  ) {
    return 'caution';
  }
  
  // Cold weather alone is fine - roads are treated
  // Clear sky with cold temps = good driving conditions
  return 'none';
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
  severity: ConditionSeverity;
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
    narrative.push({ text: '🌙 You\'ll be starting your journey in darkness.', severity: 'none' });
  }

  // Generate narrative for each segment
  segments.forEach((segment, index) => {
    const icon = getWeatherIcon(segment.weather.weatherSymbol);
    const conditions = describeConditions(segment.weather);
    const conditionSeverity = getConditionSeverity(segment.weather);
    
    if (index === 0) {
      // First segment
      if (segments.length === 1) {
        narrative.push({ text: `${icon} Throughout your journey, expect ${conditions}. Conditions remain consistent all the way to your destination.`, severity: conditionSeverity });
      } else {
        const duration = formatDuration(segment.endMinutes - segment.startMinutes);
        if (segment.endMinutes < 30) {
          narrative.push({ text: `${icon} Your trip begins with ${conditions}.`, severity: conditionSeverity });
        } else {
          narrative.push({ text: `${icon} The first ${duration} of your trip will see ${conditions}.`, severity: conditionSeverity });
        }
      }
    } else if (index === segments.length - 1) {
      // Last segment - arrival
      const locationRef = formatLocationWithTime(segment.endLocation, segment.startMinutes);
      narrative.push({ text: `${icon} As you approach ${locationRef}, expect ${conditions}.`, severity: conditionSeverity });
    } else {
      // Middle segments
      const locationRef = formatLocationWithTime(segment.startLocation, segment.startMinutes);
      narrative.push({ text: `${icon} After ${locationRef}, the weather will change to ${conditions}.`, severity: conditionSeverity });
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
          narrative.push({ text: `🌅 Sunrise at ${timeStr} ${locationRef}. Daylight driving conditions ahead.`, severity: 'none' });
        } else {
          narrative.push({ text: `🌇 Sunset at ${timeStr} ${locationRef}. You'll continue in darkness after this.`, severity: 'none' });
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
    const conditionSeverity = getConditionSeverity(lastWeather);
    narrative.push({ text: `${icon} At your destination (${lastWaypoint.name}), it will be ${temp}°C with ${getWeatherDescription(lastWeather.weatherSymbol).toLowerCase()}.${daylightNote}`, severity: conditionSeverity });
  }

  return narrative;
};

export const WeatherSummary = ({ waypoints, weatherData }: WeatherSummaryProps) => {
  const loadedCount = Array.from(weatherData.values()).filter(w => w !== null).length;
  
  if (loadedCount === 0) return null;

  const assessment = assessTrip(waypoints, weatherData);
  const overallMessage = getOverallMessage(assessment);
  const narrative = generateNarrative(waypoints, weatherData);

  const getIcon = () => {
    switch (assessment.severity) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'caution':
        return <CloudSun className="h-5 w-5" />;
      case 'good':
        return <CheckCircle className="h-5 w-5" />;
    }
  };

  const getTitle = () => {
    switch (assessment.severity) {
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
      variant={assessment.severity === 'warning' ? 'destructive' : 'default'} 
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
                {item.severity === 'severe' && <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />}
                {item.severity === 'caution' && <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />}
              </p>
            ))}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};
