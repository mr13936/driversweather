import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Waypoint, WeatherData } from '@/lib/apiUtils';
import { getWeatherDescription, isNightTime } from '@/lib/weatherUtils';

// Fix for default marker icons in Leaflet with webpack/vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Map weather symbols to simple SVG icons for map markers
const getMapWeatherSvg = (symbol: number, isNight: boolean = false): string => {
  // Clear/partly cloudy at night
  if (isNight && symbol <= 4) {
    return symbol <= 2 
      ? '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" stroke="currentColor" stroke-width="2" fill="none"/>'
      : '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M17.5 19H9a4 4 0 0 1 0-8h.5" stroke="currentColor" stroke-width="2" fill="none"/>';
  }
  
  // Sun (clear)
  if (symbol <= 2) return '<circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" stroke="currentColor" stroke-width="2"/>';
  
  // Partly cloudy
  if (symbol <= 4) return '<path d="M12 2v2M4.93 4.93l1.41 1.41M2 12h2" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10" r="4" stroke="currentColor" stroke-width="2" fill="none"/><path d="M17.5 19H9a4 4 0 0 1 0-8h.5" stroke="currentColor" stroke-width="2" fill="none"/>';
  
  // Cloudy/Overcast
  if (symbol <= 6) return '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" stroke="currentColor" stroke-width="2" fill="none"/>';
  
  // Fog
  if (symbol === 7) return '<path d="M4 14h16M4 18h16M6 10h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
  
  // Rain
  if ((symbol >= 8 && symbol <= 10) || (symbol >= 18 && symbol <= 20)) return '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M8 19v2M12 19v2M16 19v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
  
  // Thunder
  if (symbol === 11 || symbol === 21) return '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M13 12l-2 4h4l-2 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
  
  // Sleet
  if ((symbol >= 12 && symbol <= 14) || (symbol >= 22 && symbol <= 24)) return '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M8 19v1M12 19v1M16 19v1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="10" cy="22" r="1" fill="currentColor"/><circle cx="14" cy="22" r="1" fill="currentColor"/>';
  
  // Snow
  if ((symbol >= 15 && symbol <= 17) || (symbol >= 25 && symbol <= 27)) return '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 19v4M10 21h4M8 19l1 1M15 19l1 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>';
  
  // Default
  return '<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2" fill="none"/>';
};

interface RouteMapProps {
  routeGeometry: [number, number][];
  waypoints: Waypoint[];
  weatherData: Map<number, WeatherData | null>;
}

// Create custom icon with weather SVG
const createWeatherIcon = (weatherSymbol: number | null, isNight: boolean, isFirst: boolean, isLast: boolean) => {
  const bgColor = isFirst ? '#3b82f6' : isLast ? '#22c55e' : '#ffffff';
  const borderColor = isFirst ? '#2563eb' : isLast ? '#16a34a' : '#e5e7eb';
  const iconColor = isFirst || isLast ? '#ffffff' : '#374151';
  
  const svgContent = weatherSymbol !== null 
    ? getMapWeatherSvg(weatherSymbol, isNight)
    : (isFirst ? '<path d="M4 17h12M4 17l4-4M4 17l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' 
       : isLast ? '<path d="M4 15l4-6 4 6M20 12l-4 4-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
       : '<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/>');
  
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
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" style="color: ${iconColor}">
          ${svgContent}
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

const MAX_WAYPOINTS_IN_VIEW = 10;

// Filter waypoints to show max N evenly distributed from those in bounds
const filterWaypointsInBounds = (
  waypoints: Waypoint[], 
  visibleInBounds: number[],
  maxInView: number
): number[] => {
  // If 10 or fewer in view, show them all
  if (visibleInBounds.length <= maxInView) {
    return visibleInBounds;
  }
  
  // More than max in view - evenly distribute
  const filtered: number[] = [];
  const step = (visibleInBounds.length - 1) / (maxInView - 1);
  
  for (let i = 0; i < maxInView; i++) {
    const idx = Math.round(i * step);
    filtered.push(visibleInBounds[idx]);
  }
  
  return [...new Set(filtered)].sort((a, b) => a - b);
};

export const RouteMap = ({ routeGeometry, waypoints, weatherData }: RouteMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const lastRouteRef = useRef<string>(''); // Track route changes
  const [actualShown, setActualShown] = useState(0);
  const [viewVersion, setViewVersion] = useState(0); // Trigger re-render on zoom/pan

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Trigger marker update on map view change
  const handleViewChange = useCallback(() => {
    setViewVersion(n => n + 1);
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

  // Update polyline when route changes
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing polyline
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    // Add route polyline
    const routeKey = JSON.stringify(routeGeometry.slice(0, 5));
    const isNewRoute = routeKey !== lastRouteRef.current;
    
    if (routeGeometry.length > 0) {
      polylineRef.current = L.polyline(routeGeometry, {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.8,
      }).addTo(mapRef.current);

      if (isNewRoute) {
        lastRouteRef.current = routeKey;
        const bounds = L.latLngBounds(routeGeometry);
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [routeGeometry]);

  // Update markers when data or view changes
  useEffect(() => {
    if (!mapRef.current || waypoints.length === 0) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Get current map bounds
    const bounds = mapRef.current.getBounds();
    
    // Find all waypoint indices that are within the current view
    const visibleInBounds: number[] = [];
    waypoints.forEach((waypoint, index) => {
      if (bounds.contains([waypoint.lat, waypoint.lon])) {
        visibleInBounds.push(index);
      }
    });
    
    // Filter to max 10 waypoints in view, evenly distributed
    const filteredIndices = filterWaypointsInBounds(waypoints, visibleInBounds, MAX_WAYPOINTS_IN_VIEW);
    
    // Always include start and end even if outside current view
    const indicesToShow = new Set(filteredIndices);
    indicesToShow.add(0);
    indicesToShow.add(waypoints.length - 1);
    
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

      const marker = L.marker([waypoint.lat, waypoint.lon], {
        icon: createWeatherIcon(weather?.weatherSymbol ?? null, isNight, isFirst, isLast),
      }).addTo(mapRef.current);

      // Create popup content
      let popupContent = `
        <div style="min-width: 150px; font-family: system-ui, sans-serif;">
          <p style="font-weight: 600; font-size: 1.125rem; margin: 0 0 2px 0;">${formatTime(waypoint.arrivalTime)}</p>
          <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 0.875rem;">${waypoint.name}</p>
      `;

      if (weather) {
        popupContent += `
          <div style="display: flex; flex-direction: column; gap: 4px; font-size: 0.875rem;">
            <p style="margin: 0; font-weight: 500;">
              ${getWeatherDescription(weather.weatherSymbol)}
            </p>
            <p style="margin: 0; display: flex; align-items: center; gap: 4px;">
              <span style="font-weight: 500;">${weather.temperature.toFixed(1)}°C</span>
              <span style="color: #6b7280;">•</span>
              <span>${weather.windSpeed.toFixed(1)} m/s wind</span>
            </p>
            ${weather.precipitationIntensity > 0 ? `<p style="margin: 0; color: #3b82f6;">${weather.precipitationIntensity.toFixed(1)} mm/h precipitation</p>` : ''}
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
  }, [waypoints, weatherData, viewVersion]);

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
