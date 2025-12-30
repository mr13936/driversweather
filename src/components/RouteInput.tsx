import { useState } from 'react';
import { Calendar, Navigation, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CityAutocomplete } from './CityAutocomplete';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface RouteInputProps {
  onSubmit: (from: string, to: string, departureTime: Date) => void;
  isLoading: boolean;
}

export const RouteInput = ({ onSubmit, isLoading }: RouteInputProps) => {
  const [from, setFrom] = useState('Stockholm');
  const [to, setTo] = useState('Luleå');
  
  // Default to current time rounded to the nearest hour
  const getDefaultDateTime = () => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    return now.toISOString().slice(0, 16);
  };
  
  // Get min/max datetime for weather data availability (Open-Meteo provides ~7 days forecast)
  const getMinDateTime = () => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  };
  
  const getMaxDateTime = () => {
    const max = new Date();
    max.setDate(max.getDate() + 7);
    return max.toISOString().slice(0, 16);
  };
  
  const [departureTime, setDepartureTime] = useState(getDefaultDateTime());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(from, to, new Date(departureTime));
  };


  return (
    <Card className="card-shadow animate-fade-in">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
          <Navigation className="h-5 w-5 text-primary" />
          Plan Your Route
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <div>
              <CityAutocomplete
                value={from}
                onChange={setFrom}
                placeholder="Departure city"
                label="From"
              />
            </div>
            
            <div>
              <CityAutocomplete
                value={to}
                onChange={setTo}
                placeholder="Destination city"
                label="To"
              />
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                Departure Time
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground/70 hover:text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Weather forecasts available up to 7 days ahead</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="datetime-local"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  min={getMinDateTime()}
                  max={getMaxDateTime()}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="flex items-end">
              <Button 
                type="submit" 
                className="w-full font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Planning...
                  </>
                ) : (
                  <>
                    <Navigation className="mr-2 h-4 w-4" />
                    Plan Route & Get Weather
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
