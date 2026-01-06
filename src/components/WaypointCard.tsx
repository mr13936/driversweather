import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Thermometer, Droplets, Wind, Eye, AlertTriangle, Loader2, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { WeatherData, Waypoint } from '@/lib/apiUtils';
import { 
  getWeatherIconComponent, 
  getWeatherDescription, 
  getPrecipitationType,
  isDangerousConditions,
  getConditionWarnings
} from '@/lib/weatherUtils';
import { 
  calculateDrivingScore, 
  getDrivingScoreColor, 
  getDrivingScoreLabel,
  getScoreBreakdown,
  formatBreakdownForDisplay
} from '@/lib/drivingScore';
import { cn } from '@/lib/utils';

interface MouseTooltipProps {
  text: string | string[];
  children: React.ReactNode;
}

const MouseTooltip = ({ text, children }: MouseTooltipProps) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    setPosition({ x: e.clientX + 12, y: e.clientY + 12 });
  };

  const lines = Array.isArray(text) ? text : [text];

  return (
    <div
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onMouseMove={handleMouseMove}
    >
      {children}
      {visible && createPortal(
        <div
          className="fixed z-[9999] px-2 py-1 text-xs bg-popover text-popover-foreground border rounded shadow-md pointer-events-none"
          style={{ left: position.x, top: position.y }}
        >
          {lines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>,
        document.body
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

  const score = weather ? calculateDrivingScore(weather) : null;
  const scoreColors = score !== null ? getDrivingScoreColor(score) : null;
  const scoreLabel = score !== null ? getDrivingScoreLabel(score) : null;
  const breakdown = weather ? getScoreBreakdown(weather) : null;
  const breakdownLines = breakdown ? formatBreakdownForDisplay(breakdown) : [];

  return (
    <Card 
      className={cn(
        "card-shadow animate-slide-up overflow-hidden transition-all duration-300 hover:card-shadow-hover",
        hasDanger && "ring-2 ring-warning/50 bg-warning/5"
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <CardContent className="py-2 px-3">
        <div className="flex items-center gap-3">
          {/* Timeline indicator */}
          <div className="flex flex-col items-center shrink-0">
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-sm",
              isFirst && "bg-primary text-primary-foreground",
              isLast && "bg-success text-success-foreground",
              !isFirst && !isLast && "bg-secondary text-secondary-foreground"
            )}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : weather ? (
                (() => {
                  const WeatherIcon = getWeatherIconComponent(weather.weatherSymbol);
                  return <WeatherIcon className="h-4 w-4" />;
                })()
              ) : (
                <MapPin className="h-3 w-3" />
              )}
            </div>
            {!isLast && (
              <div className="mt-1 h-4 w-0.5 bg-border" />
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Row 1: Time, Weather, Location, Distance, Score, Caution */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-semibold text-foreground">
                {formatTime(waypoint.arrivalTime)}
              </span>
              
              {weather && (
                <span className="text-muted-foreground">
                  {getWeatherDescription(weather.weatherSymbol)}
                </span>
              )}
              
              <span className="text-muted-foreground truncate max-w-[200px]">
                {waypoint.name}
              </span>
              
              {waypoint.distanceFromStart > 0 && (
                <span className="text-muted-foreground text-xs">
                  {Math.round(waypoint.distanceFromStart)} km
                </span>
              )}
              
              <div className="flex items-center gap-2 ml-auto">
                {score !== null && scoreColors && (
                  <MouseTooltip text={[`Score: ${score}/100 (${scoreLabel})`, ...breakdownLines]}>
                    <div className={cn(
                      "flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium",
                      scoreColors.bg,
                      scoreColors.text,
                      scoreColors.border,
                      "border"
                    )}>
                      <span className="font-bold">{score}</span>
                    </div>
                  </MouseTooltip>
                )}
                
                {hasDanger && (
                  <div className="flex items-center gap-1 text-warning text-xs">
                    <AlertTriangle className="h-3 w-3" />
                    <span className="font-medium">Caution</span>
                    {warnings.length > 0 && (
                      <span className="text-warning/80">– {warnings.join(', ')}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Row 2: Weather metrics inline */}
            {isLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading weather...
              </div>
            ) : weather ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                <MouseTooltip text="Air temperature">
                  <div className="flex items-center gap-1">
                    <Thermometer className="h-3 w-3 text-primary" />
                    <span>{weather.temperature.toFixed(1)}°C</span>
                  </div>
                </MouseTooltip>
                
                <MouseTooltip text="Wind speed (m/s)">
                  <div className="flex items-center gap-1">
                    <Wind className="h-3 w-3 text-primary" />
                    <span>{weather.windSpeed.toFixed(1)} m/s</span>
                  </div>
                </MouseTooltip>
                
                <MouseTooltip text="Visibility">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3 text-primary" />
                    <span>{weather.visibility.toFixed(1)} km</span>
                  </div>
                </MouseTooltip>
                
                {weather.precipitationIntensity > 0 && (
                  <MouseTooltip text="Precipitation (mm/h)">
                    <div className="flex items-center gap-1">
                      <Droplets className="h-3 w-3 text-primary" />
                      <span>
                        {getPrecipitationType(weather.precipitationType, weather.temperature)} {weather.precipitationIntensity.toFixed(1)} mm/h
                      </span>
                    </div>
                  </MouseTooltip>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Weather data unavailable
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
