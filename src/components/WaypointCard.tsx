import { useState } from 'react';
import { Thermometer, Droplets, Wind, Eye, AlertTriangle, Loader2, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { WeatherData, Waypoint } from '@/lib/apiUtils';
import { 
  getWeatherIcon, 
  getWeatherDescription, 
  getPrecipitationType,
  isDangerousConditions,
  getConditionWarnings
} from '@/lib/weatherUtils';
import { cn } from '@/lib/utils';

interface MouseTooltipProps {
  text: string;
  children: React.ReactNode;
}

const MouseTooltip = ({ text, children }: MouseTooltipProps) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    setPosition({ x: e.clientX + 12, y: e.clientY + 12 });
  };

  return (
    <div
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onMouseMove={handleMouseMove}
      className="cursor-help"
    >
      {children}
      {visible && (
        <div
          className="fixed z-50 px-2 py-1 text-xs bg-popover text-popover-foreground border rounded shadow-md pointer-events-none"
          style={{ left: position.x, top: position.y }}
        >
          {text}
        </div>
      )}
    </div>
  );
};

interface WaypointCardProps {
  waypoint: Waypoint;
  weather: WeatherData | null;
  isLoading: boolean;
  index: number;
  isFirst: boolean;
  isLast: boolean;
}

export const WaypointCard = ({ 
  waypoint, 
  weather, 
  isLoading, 
  index,
  isFirst,
  isLast
}: WaypointCardProps) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const hasDanger = weather && isDangerousConditions(
    weather.precipitationIntensity,
    weather.visibility,
    weather.windSpeed
  );

  const warnings = weather ? getConditionWarnings(
    weather.precipitationIntensity,
    weather.visibility,
    weather.windSpeed
  ) : [];

  return (
    <Card 
      className={cn(
        "card-shadow animate-slide-up overflow-hidden transition-all duration-300 hover:card-shadow-hover",
        hasDanger && "ring-2 ring-warning/50 bg-warning/5"
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Timeline indicator */}
          <div className="flex flex-col items-center">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full text-lg",
              isFirst && "bg-primary text-primary-foreground",
              isLast && "bg-success text-success-foreground",
              !isFirst && !isLast && "bg-secondary text-secondary-foreground"
            )}>
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : weather ? (
                getWeatherIcon(weather.weatherSymbol)
              ) : (
                <MapPin className="h-4 w-4" />
              )}
            </div>
            {!isLast && (
              <div className="mt-2 h-full w-0.5 bg-border" />
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-foreground truncate">
                  {waypoint.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(waypoint.arrivalTime)} • {Math.round(waypoint.distanceFromStart)} km
                </p>
              </div>
              
              {hasDanger && (
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  Caution
                </Badge>
              )}
            </div>
            
            {isLoading ? (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading weather...
              </div>
            ) : weather ? (
              <div className="mt-3">
                <p className="text-sm font-medium text-foreground mb-2">
                  {getWeatherDescription(weather.weatherSymbol)}
                </p>
                
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <MouseTooltip text="Air temperature">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Thermometer className="h-4 w-4 text-primary" />
                      <span>{weather.temperature.toFixed(1)}°C</span>
                    </div>
                  </MouseTooltip>
                  
                  <MouseTooltip text="Wind speed (meters per second)">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Wind className="h-4 w-4 text-primary" />
                      <span>{weather.windSpeed.toFixed(1)} m/s</span>
                    </div>
                  </MouseTooltip>
                  
                  {weather.precipitationIntensity > 0 && (
                    <MouseTooltip text="Precipitation intensity (millimeters per hour)">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Droplets className="h-4 w-4 text-primary" />
                        <span>
                          {getPrecipitationType(weather.precipitationType, weather.temperature)} {weather.precipitationIntensity.toFixed(1)} mm/h
                        </span>
                      </div>
                    </MouseTooltip>
                  )}
                  
                  <MouseTooltip text="Visibility distance">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Eye className="h-4 w-4 text-primary" />
                      <span>{weather.visibility.toFixed(1)} km</span>
                    </div>
                  </MouseTooltip>
                </div>
                
                {warnings.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {warnings.map((warning, i) => (
                      <Badge 
                        key={i} 
                        variant="secondary" 
                        className="bg-warning/10 text-warning-foreground text-xs"
                      >
                        {warning}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Weather data unavailable
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
