import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
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

// Component to fit bounds when route changes
const FitBounds = ({ bounds }: { bounds: L.LatLngBoundsExpression }) => {
  const map = useMap();
  
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, bounds]);
  
  return null;
};

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
  // Calculate bounds from route geometry
  const bounds = useMemo(() => {
    if (routeGeometry.length === 0) return null;
    return L.latLngBounds(routeGeometry.map(([lat, lon]) => [lat, lon]));
  }, [routeGeometry]);

  // Default center (Sweden)
  const defaultCenter: [number, number] = [62.0, 17.0];
  const defaultZoom = 5;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('sv-SE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="relative w-full h-[400px] rounded-lg overflow-hidden card-shadow animate-slide-up">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="w-full h-full z-0"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {bounds && <FitBounds bounds={bounds} />}
        
        {/* Route polyline */}
        {routeGeometry.length > 0 && (
          <Polyline
            positions={routeGeometry}
            pathOptions={{
              color: '#3b82f6',
              weight: 4,
              opacity: 0.8,
            }}
          />
        )}
        
        {/* Waypoint markers with weather icons */}
        {waypoints.map((waypoint, index) => {
          const weather = weatherData.get(index);
          const isFirst = index === 0;
          const isLast = index === waypoints.length - 1;
          const emoji = weather ? getWeatherIcon(weather.weatherSymbol) : (isFirst ? '🚗' : isLast ? '🏁' : '📍');
          
          return (
            <Marker
              key={index}
              position={[waypoint.lat, waypoint.lon]}
              icon={createWeatherIcon(emoji, isFirst, isLast)}
            >
              <Popup>
                <div className="text-sm min-w-[150px]">
                  <p className="font-semibold text-foreground">{waypoint.name}</p>
                  <p className="text-muted-foreground">{formatTime(waypoint.arrivalTime)}</p>
                  {weather && (
                    <div className="mt-2 space-y-1">
                      <p className="flex items-center gap-2">
                        <span className="text-lg">{getWeatherIcon(weather.weatherSymbol)}</span>
                        <span>{getWeatherDescription(weather.weatherSymbol)}</span>
                      </p>
                      <p>🌡️ {weather.temperature.toFixed(1)}°C</p>
                      <p>💨 {weather.windSpeed.toFixed(1)} m/s</p>
                      {weather.precipitationIntensity > 0 && (
                        <p>💧 {weather.precipitationIntensity.toFixed(1)} mm/h</p>
                      )}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
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
