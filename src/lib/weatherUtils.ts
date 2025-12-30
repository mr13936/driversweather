// SMHI Weather Symbol mapping to emojis and descriptions
export const getWeatherIcon = (symbol: number): string => {
  const icons: Record<number, string> = {
    1: '☀️',   // Clear sky
    2: '🌤️',  // Nearly clear sky
    3: '⛅',   // Variable cloudiness
    4: '⛅',   // Halfclear sky
    5: '☁️',   // Cloudy sky
    6: '☁️',   // Overcast
    7: '🌫️',  // Fog
    8: '🌧️',  // Light rain showers
    9: '🌧️',  // Moderate rain showers
    10: '⛈️', // Heavy rain showers
    11: '⛈️', // Thunderstorm
    12: '🌨️', // Light sleet showers
    13: '🌨️', // Moderate sleet showers
    14: '🌨️', // Heavy sleet showers
    15: '❄️',  // Light snow showers
    16: '❄️',  // Moderate snow showers
    17: '❄️',  // Heavy snow showers
    18: '🌧️', // Light rain
    19: '🌧️', // Moderate rain
    20: '🌧️', // Heavy rain
    21: '⛈️', // Thunder
    22: '🌨️', // Light sleet
    23: '🌨️', // Moderate sleet
    24: '🌨️', // Heavy sleet
    25: '❄️',  // Light snowfall
    26: '❄️',  // Moderate snowfall
    27: '❄️',  // Heavy snowfall
  };
  return icons[symbol] || '🌡️';
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

export const getPrecipitationType = (pcat: number): string => {
  const types: Record<number, string> = {
    0: 'None',
    1: 'Snow',
    2: 'Sleet',
    3: 'Rain',
    4: 'Drizzle',
    5: 'Freezing rain',
    6: 'Freezing drizzle',
  };
  return types[pcat] || 'Unknown';
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
