import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Waypoint, WeatherData } from '@/lib/apiUtils';
import { getWeatherIcon, getWeatherDescription } from '@/lib/weatherUtils';

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

export const RouteMap = ({ routeGeometry, waypoints, weatherData }: RouteMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('sv-SE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current).setView([62.0, 17.0], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

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
    if (routeGeometry.length > 0) {
      polylineRef.current = L.polyline(routeGeometry, {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.8,
      }).addTo(mapRef.current);

      // Fit bounds to route
      const bounds = L.latLngBounds(routeGeometry);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }

    // Add waypoint markers
    waypoints.forEach((waypoint, index) => {
      if (!mapRef.current) return;

      const weather = weatherData.get(index);
      const isFirst = index === 0;
      const isLast = index === waypoints.length - 1;
      const emoji = weather 
        ? getWeatherIcon(weather.weatherSymbol) 
        : (isFirst ? '🚗' : isLast ? '🏁' : '📍');

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
              <span style="font-size: 1.25rem;">${getWeatherIcon(weather.weatherSymbol)}</span>
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
        </div>
      </div>
    </div>
  );
};
