export interface Coordinates {
  lat: number;
  lon: number;
  displayName: string;
}

export interface RouteStep {
  location: [number, number];
  name: string;
  distance: number;
  duration: number;
}

export interface RouteData {
  distance: number; // in km
  duration: number; // in seconds
  steps: RouteStep[];
  geometry: [number, number][];
}

export interface Waypoint {
  lat: number;
  lon: number;
  name: string;
  arrivalTime: Date;
  distanceFromStart: number;
}

export interface WeatherData {
  temperature: number;
  precipitationType: number;
  precipitationIntensity: number;
  windSpeed: number;
  visibility: number;
  weatherSymbol: number;
  sunrise: Date | null;
  sunset: Date | null;
}

// Geocode a location name to coordinates using Nominatim (worldwide)
export const geocodeLocation = async (name: string): Promise<Coordinates> => {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(name)}&limit=1`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'RouteWeatherPlanner/1.0'
    }
  });
  
  if (!response.ok) {
    throw new Error('Geocoding request failed');
  }
  
  const data = await response.json();
  
  if (data.length === 0) {
    throw new Error(`Location "${name}" not found`);
  }
  
  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    displayName: data[0].display_name
  };
};

// Get route from OSRM
// Get route from OSRM (using HTTPS to avoid mixed content issues)
export const getRoute = async (
  from: Coordinates,
  to: Coordinates
): Promise<RouteData> => {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson&steps=true`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Route calculation failed');
  }
  
  const data = await response.json();
  
  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error('No route found between locations');
  }
  
  const route = data.routes[0];
  const steps: RouteStep[] = route.legs[0].steps.map((step: any) => ({
    location: step.maneuver.location,
    name: step.name || 'Unnamed road',
    distance: step.distance,
    duration: step.duration
  }));
  
  return {
    distance: route.distance / 1000, // Convert to km
    duration: route.duration,
    steps,
    geometry: route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]])
  };
};

// Calculate waypoints at hourly intervals
export const calculateWaypoints = (
  route: RouteData,
  departureTime: Date,
  fromName: string,
  toName: string
): Waypoint[] => {
  const waypoints: Waypoint[] = [];
  const totalDurationHours = route.duration / 3600;
  const hourCount = Math.ceil(totalDurationHours);
  
  // Add starting point
  waypoints.push({
    lat: route.geometry[0][0],
    lon: route.geometry[0][1],
    name: fromName,
    arrivalTime: new Date(departureTime),
    distanceFromStart: 0
  });
  
  // Calculate hourly waypoints
  for (let hour = 1; hour <= hourCount; hour++) {
    const targetTime = hour * 3600; // seconds from start
    
    if (targetTime >= route.duration) {
      // Final destination
      const lastPoint = route.geometry[route.geometry.length - 1];
      waypoints.push({
        lat: lastPoint[0],
        lon: lastPoint[1],
        name: toName,
        arrivalTime: new Date(departureTime.getTime() + route.duration * 1000),
        distanceFromStart: route.distance
      });
      break;
    }
    
    // Find position along route at this time
    const progress = targetTime / route.duration;
    const pointIndex = Math.floor(progress * (route.geometry.length - 1));
    const point = route.geometry[Math.min(pointIndex, route.geometry.length - 1)];
    
    // Find nearest step name
    let accumulatedDuration = 0;
    let locationName = 'En route';
    for (const step of route.steps) {
      accumulatedDuration += step.duration;
      if (accumulatedDuration >= targetTime) {
        locationName = step.name || 'En route';
        break;
      }
    }
    
    waypoints.push({
      lat: point[0],
      lon: point[1],
      name: locationName,
      arrivalTime: new Date(departureTime.getTime() + targetTime * 1000),
      distanceFromStart: progress * route.distance
    });
  }
  
  return waypoints;
};

// Check if coordinates are in Sweden (approximate bounding box)
const isInSweden = (lat: number, lon: number): boolean => {
  return lat >= 55.0 && lat <= 69.5 && lon >= 10.5 && lon <= 24.5;
};

// Get weather data from SMHI for Sweden
const getWeatherFromSMHI = async (
  lat: number,
  lon: number,
  targetTime: Date
): Promise<WeatherData> => {
  // SMHI requires coordinates with max 6 decimals
  const roundedLat = Math.round(lat * 1000000) / 1000000;
  const roundedLon = Math.round(lon * 1000000) / 1000000;
  
  const url = `https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point/lon/${roundedLon}/lat/${roundedLat}/data.json`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'WeatherWay/1.0'
    }
  });
  
  if (!response.ok) {
    throw new Error('SMHI weather request failed');
  }
  
  const data = await response.json();
  
  // Find the forecast closest to the target time
  const targetTimestamp = targetTime.getTime();
  let closestIndex = 0;
  let closestDiff = Infinity;
  
  for (let i = 0; i < data.timeSeries.length; i++) {
    const forecastTime = new Date(data.timeSeries[i].validTime).getTime();
    const diff = Math.abs(forecastTime - targetTimestamp);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestIndex = i;
    }
  }
  
  const forecast = data.timeSeries[closestIndex];
  
  // Helper to get parameter value
  const getParam = (name: string): number => {
    const param = forecast.parameters.find((p: any) => p.name === name);
    return param ? param.values[0] : 0;
  };
  
  const temperature = getParam('t'); // Temperature in Celsius
  const windSpeed = getParam('ws'); // Wind speed in m/s
  const visibility = getParam('vis'); // Visibility in km
  const precipitationCategory = getParam('pcat'); // Precipitation category
  const precipitationIntensity = getParam('pmean'); // Mean precipitation intensity mm/h
  const weatherSymbolCode = getParam('Wsymb2'); // Weather symbol
  
  // Map SMHI weather symbol to our format
  const weatherSymbol = mapSMHIWeatherSymbol(weatherSymbolCode);
  
  // Calculate approximate sunrise/sunset for the date
  const { sunrise, sunset } = calculateSunTimes(lat, lon, targetTime);
  
  return {
    temperature,
    precipitationType: precipitationCategory,
    precipitationIntensity,
    windSpeed,
    visibility: visibility || 50,
    weatherSymbol,
    sunrise,
    sunset
  };
};

// Map SMHI Wsymb2 codes to our internal format
const mapSMHIWeatherSymbol = (code: number): number => {
  // 1-2: Clear
  if (code <= 2) return 1;
  // 3-4: Partly cloudy
  if (code <= 4) return 2;
  // 5-6: Cloudy
  if (code <= 6) return 3;
  // 7: Fog
  if (code === 7) return 4;
  // 8-10: Light rain
  if (code <= 10) return 5;
  // 11-14: Rain/Heavy rain
  if (code <= 14) return 6;
  // 15-17: Snow
  if (code <= 17) return 8;
  // 18-20: Rain and snow
  if (code <= 20) return 6;
  // 21-27: Thunder
  if (code <= 27) return 9;
  return 1;
};

// Simple sun calculation (approximation)
const calculateSunTimes = (lat: number, lon: number, date: Date): { sunrise: Date | null; sunset: Date | null } => {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * Math.PI / 180);
  const latRad = lat * Math.PI / 180;
  const decRad = declination * Math.PI / 180;
  
  const hourAngle = Math.acos(-Math.tan(latRad) * Math.tan(decRad)) * 180 / Math.PI;
  const solarNoon = 12 - lon / 15;
  
  const sunriseHour = solarNoon - hourAngle / 15;
  const sunsetHour = solarNoon + hourAngle / 15;
  
  const sunrise = new Date(date);
  sunrise.setHours(Math.floor(sunriseHour), Math.round((sunriseHour % 1) * 60), 0, 0);
  
  const sunset = new Date(date);
  sunset.setHours(Math.floor(sunsetHour), Math.round((sunsetHour % 1) * 60), 0, 0);
  
  return { sunrise, sunset };
};

// Get weather data - uses SMHI for Sweden, Open-Meteo for elsewhere
export const getWeather = async (
  lat: number,
  lon: number,
  targetTime: Date
): Promise<WeatherData> => {
  // Use SMHI for Swedish locations
  if (isInSweden(lat, lon)) {
    try {
      return await getWeatherFromSMHI(lat, lon, targetTime);
    } catch (error) {
      console.warn('SMHI request failed, falling back to Open-Meteo:', error);
      // Fall through to Open-Meteo
    }
  }
  
  // Use Open-Meteo for non-Swedish locations or as fallback
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation,weather_code,wind_speed_10m,visibility&daily=sunrise,sunset&timezone=auto`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Weather data request failed');
  }
  
  const data = await response.json();
  
  // Find the forecast closest to the target time
  const targetTimestamp = targetTime.getTime();
  let closestIndex = 0;
  let closestDiff = Infinity;
  
  for (let i = 0; i < data.hourly.time.length; i++) {
    const forecastTime = new Date(data.hourly.time[i]).getTime();
    const diff = Math.abs(forecastTime - targetTimestamp);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestIndex = i;
    }
  }
  
  // Find the sunrise/sunset for the target date
  const targetDateStr = targetTime.toISOString().split('T')[0];
  let sunrise: Date | null = null;
  let sunset: Date | null = null;
  
  if (data.daily && data.daily.time) {
    const dayIndex = data.daily.time.findIndex((d: string) => d === targetDateStr);
    if (dayIndex !== -1) {
      sunrise = data.daily.sunrise[dayIndex] ? new Date(data.daily.sunrise[dayIndex]) : null;
      sunset = data.daily.sunset[dayIndex] ? new Date(data.daily.sunset[dayIndex]) : null;
    }
  }
  
  // Map Open-Meteo weather codes to our weather symbol format
  const weatherCode = data.hourly.weather_code[closestIndex] || 0;
  const weatherSymbol = mapWeatherCodeToSymbol(weatherCode);
  
  return {
    temperature: data.hourly.temperature_2m[closestIndex] || 0,
    precipitationType: weatherCode >= 60 && weatherCode < 70 ? 1 : (weatherCode >= 70 && weatherCode < 80 ? 2 : 0),
    precipitationIntensity: data.hourly.precipitation[closestIndex] || 0,
    windSpeed: data.hourly.wind_speed_10m[closestIndex] || 0,
    visibility: (data.hourly.visibility[closestIndex] || 50000) / 1000, // Convert to km
    weatherSymbol,
    sunrise,
    sunset
  };
};

// Map Open-Meteo WMO weather codes to our internal symbol format
const mapWeatherCodeToSymbol = (code: number): number => {
  // Clear
  if (code === 0) return 1;
  // Partly cloudy
  if (code === 1 || code === 2) return 2;
  // Cloudy
  if (code === 3) return 3;
  // Fog
  if (code >= 45 && code <= 48) return 4;
  // Light rain
  if (code >= 51 && code <= 55) return 5;
  // Rain
  if (code >= 61 && code <= 65) return 6;
  // Heavy rain
  if (code >= 80 && code <= 82) return 7;
  // Snow
  if (code >= 71 && code <= 77) return 8;
  // Thunderstorm
  if (code >= 95 && code <= 99) return 9;
  return 1;
};
