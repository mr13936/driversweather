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

const MAX_VISIBLE_WAYPOINTS = 10;

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

// Filter waypoints to show max N evenly distributed points, always including first and last
const filterWaypoints = (waypoints: Waypoint[], maxVisible: number): number[] => {
  if (waypoints.length <= maxVisible) {
    return waypoints.map((_, i) => i);
  }

  const indices: number[] = [0]; // Always include first
  
  // Calculate evenly spaced intermediate points
  const intermediateCount = maxVisible - 2; // Subtract first and last
  const step = (waypoints.length - 1) / (intermediateCount + 1);
  
  for (let i = 1; i <= intermediateCount; i++) {
    const index = Math.round(step * i);
    if (index > 0 && index < waypoints.length - 1) {
      indices.push(index);
    }
  }
  
  indices.push(waypoints.length - 1); // Always include last
  
  return [...new Set(indices)].sort((a, b) => a - b);
};

export const RouteMap = ({ routeGeometry, waypoints, weatherData }: RouteMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const lastRouteRef = useRef<string>(''); // Track route changes
  const [visibleCount, setVisibleCount] = useState(MAX_VISIBLE_WAYPOINTS);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Calculate visible count based on zoom level
  const updateVisibleCount = useCallback(() => {
    if (!mapRef.current) return;
    
    const zoom = mapRef.current.getZoom();
    // More waypoints visible when zoomed in, fewer when zoomed out
    // zoom 5-6: ~6 waypoints, zoom 7-8: ~8, zoom 9+: ~10+
    const count = Math.min(
      waypoints.length,
      Math.max(4, Math.floor(zoom * 1.2))
    );
    setVisibleCount(Math.min(count, MAX_VISIBLE_WAYPOINTS));
  }, [waypoints.length]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current).setView([62.0, 17.0], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapRef.current);

    // Listen for zoom changes
    mapRef.current.on('zoomend', updateVisibleCount);

    return () => {
      if (mapRef.current) {
        mapRef.current.off('zoomend', updateVisibleCount);
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [updateVisibleCount]);

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

    // Get filtered waypoint indices
    const visibleIndices = filterWaypoints(waypoints, visibleCount);

    // Add waypoint markers only for visible indices
    visibleIndices.forEach((originalIndex) => {
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
    });

    // Update visible count based on current zoom
    updateVisibleCount();
  }, [routeGeometry, waypoints, weatherData, visibleCount, updateVisibleCount]);

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
          {waypoints.length > visibleCount && (
            <span className="text-muted-foreground">
              ({visibleCount}/{waypoints.length} shown)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
