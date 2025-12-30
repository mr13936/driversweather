import { CloudSun } from 'lucide-react';
import { WaypointCard } from './WaypointCard';
import type { Waypoint, WeatherData } from '@/lib/apiUtils';

interface WeatherTimelineProps {
  waypoints: Waypoint[];
  weatherData: Map<number, WeatherData | null>;
  loadingStates: Map<number, boolean>;
}

export const WeatherTimeline = ({ 
  waypoints, 
  weatherData, 
  loadingStates 
}: WeatherTimelineProps) => {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <CloudSun className="h-5 w-5 text-primary" />
        <h2>Weather Along Your Route</h2>
      </div>
      
      <div className="space-y-3">
        {waypoints.map((waypoint, index) => (
          <WaypointCard
            key={index}
            waypoint={waypoint}
            weather={weatherData.get(index) || null}
            isLoading={loadingStates.get(index) || false}
            index={index}
            isFirst={index === 0}
            isLast={index === waypoints.length - 1}
          />
        ))}
      </div>
    </div>
  );
};
