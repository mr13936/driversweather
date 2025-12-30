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

// Get weather data from Open-Meteo (worldwide, free, no API key)
export const getWeather = async (
  lat: number,
  lon: number,
  targetTime: Date
): Promise<WeatherData> => {
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
