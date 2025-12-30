import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Waypoint, WeatherData } from '@/lib/apiUtils';
import { getWeatherIcon, getWeatherDescription, isNightTime } from '@/lib/weatherUtils';

// Fix for default marker icons in Leaflet with webpack/vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface RouteMapProps {
  routeGeometry: [number, number][];
  waypoints: Waypoint[];
  weatherData: Map<number, WeatherData | null>;
}

// Create custom icon with weather emoji
const createWeatherIcon = (emoji: string, isFirst: boolean, isLast: boolean) => {
  const bgColor = isFirst ? '#3b82f6' : isLast ? '#22c55e' : '#ffffff';
  const borderColor = isFirst ? '#2563eb' : isLast ? '#16a34a' : '#e5e7eb';
  
  return L.divIcon({
    className: 'custom-weather-marker',
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        background: ${bgColor};
        border: 2px solid ${borderColor};
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        font-size: 20px;
      ">
        ${emoji}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

// Filter waypoints based on density - always include first and last
const filterWaypointsByDensity = (
  waypoints: Waypoint[], 
  visibleInBounds: number[]
): number[] => {
  const totalVisible = visibleInBounds.length;
  
  // Determine divisor based on how many waypoints are in view
  let divisor = 1; // Show all by default
  if (totalVisible > 20) {
    divisor = 4; // Show every 4th
  } else if (totalVisible > 10) {
    divisor = 2; // Show every 2nd
  }
  
  if (divisor === 1) {
    return visibleInBounds;
  }
  
  // Filter indices, always keeping first and last
  const filtered: number[] = [];
  
  visibleInBounds.forEach((originalIndex, i) => {
    const isFirst = originalIndex === 0;
    const isLast = originalIndex === waypoints.length - 1;
    
    // Always include first and last, or every Nth waypoint
    if (isFirst || isLast || i % divisor === 0) {
      filtered.push(originalIndex);
    }
  });
  
  return filtered;
};

export const RouteMap = ({ routeGeometry, waypoints, weatherData }: RouteMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const lastRouteRef = useRef<string>(''); // Track route changes
  const [actualShown, setActualShown] = useState(0);
  const [, forceUpdate] = useState(0); // Trigger re-render on zoom/pan

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Trigger marker update on map view change
  const handleViewChange = useCallback(() => {
    forceUpdate(n => n + 1);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current).setView([62.0, 17.0], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapRef.current);

    // Listen for view changes (zoom and pan)
    mapRef.current.on('zoomend', handleViewChange);
    mapRef.current.on('moveend', handleViewChange);

    return () => {
      if (mapRef.current) {
        mapRef.current.off('zoomend', handleViewChange);
        mapRef.current.off('moveend', handleViewChange);
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [handleViewChange]);

  // Update route and markers when data changes
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Clear existing polyline
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    // Add route polyline
    const routeKey = JSON.stringify(routeGeometry.slice(0, 5)); // Simple check for route changes
    const isNewRoute = routeKey !== lastRouteRef.current;
    
    if (routeGeometry.length > 0) {
      polylineRef.current = L.polyline(routeGeometry, {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.8,
      }).addTo(mapRef.current);

      // Only fit bounds when the route itself changes, not on zoom/visibleCount changes
      if (isNewRoute) {
        lastRouteRef.current = routeKey;
        const bounds = L.latLngBounds(routeGeometry);
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }

    // Get current map bounds
    const bounds = mapRef.current.getBounds();
    
    // Find all waypoint indices that are within the current view
    const visibleInBounds: number[] = [];
    waypoints.forEach((waypoint, index) => {
      if (bounds.contains([waypoint.lat, waypoint.lon])) {
        visibleInBounds.push(index);
      }
    });
    
    // Filter based on density (>10 = every 2nd, >20 = every 4th)
    const filteredIndices = filterWaypointsByDensity(waypoints, visibleInBounds);
    
    // Also always include waypoints outside bounds that are first/last
    const indicesToShow = new Set(filteredIndices);
    indicesToShow.add(0); // Always show start
    indicesToShow.add(waypoints.length - 1); // Always show end
    
    const finalIndices = Array.from(indicesToShow).sort((a, b) => a - b);
    
    // Track actual number of markers we're adding
    let markerCount = 0;

    // Add waypoint markers
    finalIndices.forEach((originalIndex) => {
      if (!mapRef.current) return;
      
      const waypoint = waypoints[originalIndex];
      const weather = weatherData.get(originalIndex);
      const isFirst = originalIndex === 0;
      const isLast = originalIndex === waypoints.length - 1;
      const isNight = weather ? isNightTime(waypoint.arrivalTime, weather.sunrise, weather.sunset) : false;
      const emoji = weather 
        ? getWeatherIcon(weather.weatherSymbol, isNight) 
        : (isFirst ? '🚗' : isLast ? '🏁' : '⏳');

      const marker = L.marker([waypoint.lat, waypoint.lon], {
        icon: createWeatherIcon(emoji, isFirst, isLast),
      }).addTo(mapRef.current);

      // Create popup content
      let popupContent = `
        <div style="min-width: 150px; font-family: system-ui, sans-serif;">
          <p style="font-weight: 600; margin: 0 0 4px 0;">${waypoint.name}</p>
          <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 0.875rem;">${formatTime(waypoint.arrivalTime)}</p>
      `;

      if (weather) {
        popupContent += `
          <div style="display: flex; flex-direction: column; gap: 4px; font-size: 0.875rem;">
            <p style="margin: 0; display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 1.25rem;">${getWeatherIcon(weather.weatherSymbol, isNight)}</span>
              <span>${getWeatherDescription(weather.weatherSymbol)}</span>
            </p>
            <p style="margin: 0;">🌡️ ${weather.temperature.toFixed(1)}°C</p>
            <p style="margin: 0;">💨 ${weather.windSpeed.toFixed(1)} m/s</p>
            ${weather.precipitationIntensity > 0 ? `<p style="margin: 0;">💧 ${weather.precipitationIntensity.toFixed(1)} mm/h</p>` : ''}
          </div>
        `;
      }

      popupContent += '</div>';

      marker.bindPopup(popupContent);
      markersRef.current.push(marker);
      markerCount++;
    });

    // Update actual shown count
    setActualShown(markerCount);
  }, [routeGeometry, waypoints, weatherData]);

  return (
    <div className="relative w-full h-[400px] rounded-lg overflow-hidden card-shadow animate-slide-up">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      
      {/* Map legend */}
      <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-sm rounded-lg px-3 py-2 text-xs shadow-md z-[1000]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-primary"></span>
            Start
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-success"></span>
            End
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-card border border-border"></span>
            Waypoint
          </span>
          {waypoints.length > actualShown && (
            <span className="text-muted-foreground">
              ({actualShown}/{waypoints.length} shown)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
