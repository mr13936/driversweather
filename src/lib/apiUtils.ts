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
}

// Geocode a location name to coordinates using Nominatim
export const geocodeLocation = async (name: string): Promise<Coordinates> => {
  const searchQuery = `${name}, Sweden`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`;
  
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
    throw new Error(`Location "${name}" not found in Sweden`);
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

// Get weather data from SMHI for a specific location and time
export const getWeather = async (
  lat: number,
  lon: number,
  targetTime: Date
): Promise<WeatherData> => {
  // Round coordinates to 6 decimal places as required by SMHI
  const roundedLat = Math.round(lat * 1000000) / 1000000;
  const roundedLon = Math.round(lon * 1000000) / 1000000;
  
  const url = `https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point/lon/${roundedLon}/lat/${roundedLat}/data.json`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Weather data request failed');
  }
  
  const data = await response.json();
  
  // Find the forecast closest to the target time
  const targetTimestamp = targetTime.getTime();
  let closestForecast = data.timeSeries[0];
  let closestDiff = Infinity;
  
  for (const forecast of data.timeSeries) {
    const forecastTime = new Date(forecast.validTime).getTime();
    const diff = Math.abs(forecastTime - targetTimestamp);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestForecast = forecast;
    }
  }
  
  // Extract parameters
  const getParam = (name: string): number => {
    const param = closestForecast.parameters.find((p: any) => p.name === name);
    return param ? param.values[0] : 0;
  };
  
  return {
    temperature: getParam('t'),
    precipitationType: getParam('pcat'),
    precipitationIntensity: getParam('pmean'),
    windSpeed: getParam('ws'),
    visibility: getParam('vis'),
    weatherSymbol: getParam('Wsymb2')
  };
};
