import { Clock, Route, MapPin, Flag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface RouteSummaryProps {
  distance: number;
  duration: number;
  departureTime: Date;
  fromName: string;
  toName: string;
}

export const RouteSummary = ({
  distance,
  duration,
  departureTime,
  fromName,
  toName
}: RouteSummaryProps) => {
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const arrivalTime = new Date(departureTime.getTime() + duration * 1000);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <Card className="card-shadow animate-slide-up overflow-hidden">
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">{fromName}</span>
          </div>
          <div className="flex-1 border-t-2 border-dashed border-primary/30" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Flag className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">{toName}</span>
          </div>
        </div>
      </div>
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Route className="h-4 w-4" />
              <span>Distance</span>
            </div>
            <p className="text-2xl font-semibold">{Math.round(distance)} km</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Duration</span>
            </div>
            <p className="text-2xl font-semibold">{formatDuration(duration)}</p>
          </div>
          
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Departure</div>
            <p className="text-lg font-semibold">{formatTime(departureTime)}</p>
            <p className="text-xs text-muted-foreground">{formatDate(departureTime)}</p>
          </div>
          
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Arrival</div>
            <p className="text-lg font-semibold">{formatTime(arrivalTime)}</p>
            <p className="text-xs text-muted-foreground">{formatDate(arrivalTime)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
