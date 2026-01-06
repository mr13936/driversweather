import { Sun, Moon, Cloud, CloudSun, CloudMoon, CloudFog, CloudRain, CloudLightning, CloudSnow, Snowflake, Thermometer, type LucideIcon } from 'lucide-react';

// SMHI Weather Symbol mapping to Lucide icons
export const getWeatherIconComponent = (symbol: number, isNight: boolean = false): LucideIcon => {
  // Night variants for clear/partly cloudy conditions
  if (isNight) {
    const nightIcons: Record<number, LucideIcon> = {
      1: Moon,        // Clear sky at night
      2: Moon,        // Nearly clear sky at night
      3: CloudMoon,   // Variable cloudiness at night
      4: CloudMoon,   // Halfclear sky at night
    };
    if (nightIcons[symbol]) return nightIcons[symbol];
  }
  
  const icons: Record<number, LucideIcon> = {
    1: Sun,           // Clear sky
    2: CloudSun,      // Nearly clear sky
    3: CloudSun,      // Variable cloudiness
    4: CloudSun,      // Halfclear sky
    5: Cloud,         // Cloudy sky
    6: Cloud,         // Overcast
    7: CloudFog,      // Fog
    8: CloudRain,     // Light rain showers
    9: CloudRain,     // Moderate rain showers
    10: CloudLightning, // Heavy rain showers
    11: CloudLightning, // Thunderstorm
    12: CloudSnow,    // Light sleet showers
    13: CloudSnow,    // Moderate sleet showers
    14: CloudSnow,    // Heavy sleet showers
    15: Snowflake,    // Light snow showers
    16: Snowflake,    // Moderate snow showers
    17: Snowflake,    // Heavy snow showers
    18: CloudRain,    // Light rain
    19: CloudRain,    // Moderate rain
    20: CloudRain,    // Heavy rain
    21: CloudLightning, // Thunder
    22: CloudSnow,    // Light sleet
    23: CloudSnow,    // Moderate sleet
    24: CloudSnow,    // Heavy sleet
    25: Snowflake,    // Light snowfall
    26: Snowflake,    // Moderate snowfall
    27: Snowflake,    // Heavy snowfall
  };
  return icons[symbol] || Thermometer;
};

// Legacy emoji function for backward compatibility
export const getWeatherIcon = (symbol: number, isNight: boolean = false): string => {
  if (isNight && symbol <= 4) return symbol <= 2 ? '●' : '◐';
  const icons: Record<number, string> = {
    1: '○', 2: '◐', 3: '◐', 4: '◐', 5: '●', 6: '●', 7: '≡',
    8: '∴', 9: '∴', 10: '⚡', 11: '⚡', 12: '∵', 13: '∵', 14: '∵',
    15: '*', 16: '*', 17: '*', 18: '∴', 19: '∴', 20: '∴', 21: '⚡',
    22: '∵', 23: '∵', 24: '∵', 25: '*', 26: '*', 27: '*',
  };
  return icons[symbol] || '?';
};

// Helper to determine if a given time is during night hours
export const isNightTime = (time: Date, sunrise?: Date, sunset?: Date): boolean => {
  if (!sunrise || !sunset) return false;
  
  return time.getTime() < sunrise.getTime() || time.getTime() > sunset.getTime();
};

export const getWeatherDescription = (symbol: number): string => {
  const descriptions: Record<number, string> = {
    1: 'Clear sky',
    2: 'Nearly clear',
    3: 'Variable clouds',
    4: 'Halfclear',
    5: 'Cloudy',
    6: 'Overcast',
    7: 'Fog',
    8: 'Light rain showers',
    9: 'Rain showers',
    10: 'Heavy rain showers',
    11: 'Thunderstorm',
    12: 'Light sleet',
    13: 'Sleet',
    14: 'Heavy sleet',
    15: 'Light snow',
    16: 'Snow',
    17: 'Heavy snow',
    18: 'Light rain',
    19: 'Rain',
    20: 'Heavy rain',
    21: 'Thunder',
    22: 'Light sleet',
    23: 'Sleet',
    24: 'Heavy sleet',
    25: 'Light snow',
    26: 'Snowfall',
    27: 'Heavy snowfall',
  };
  return descriptions[symbol] || 'Unknown';
};

export const getPrecipitationType = (pcat: number, temperature?: number): string => {
  // If temperature is provided and above 2°C, snow/sleet becomes rain
  if (temperature !== undefined && temperature > 2) {
    if (pcat === 1 || pcat === 2) {
      return 'Rain'; // Snow/sleet is not possible above 2°C
    }
  }
  
  const types: Record<number, string> = {
    0: 'None',
    1: 'Snow',
    2: 'Sleet',
    3: 'Rain',
    4: 'Drizzle',
    5: 'Freezing rain',
    6: 'Freezing drizzle',
  };
  return types[pcat] || 'Precipitation';
};

export const isDangerousConditions = (
  precipitation: number,
  visibility: number,
  windSpeed: number
): boolean => {
  return precipitation > 2 || visibility < 5 || windSpeed > 15;
};

export const getConditionWarnings = (
  precipitation: number,
  visibility: number,
  windSpeed: number
): string[] => {
  const warnings: string[] = [];
  if (precipitation > 2) warnings.push('Heavy precipitation');
  if (visibility < 5) warnings.push('Low visibility');
  if (windSpeed > 15) warnings.push('Strong winds');
  return warnings;
};
