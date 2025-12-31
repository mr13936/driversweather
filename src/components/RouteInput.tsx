import { useState, useRef } from 'react';
import { Navigation, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CityAutocomplete } from './CityAutocomplete';

interface RouteInputProps {
  onSubmit: (from: string, to: string, departureTime: Date) => void;
  isLoading: boolean;
}

export const RouteInput = ({ onSubmit, isLoading }: RouteInputProps) => {
  const [from, setFrom] = useState('Stockholm');
  const [to, setTo] = useState('Luleå');
  const [buttonWidth, setButtonWidth] = useState<number | undefined>(undefined);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
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
    // Capture button width before loading starts
    if (buttonRef.current) {
      setButtonWidth(buttonRef.current.offsetWidth);
    }
    onSubmit(from, to, new Date(departureTime));
  };


  return (
    <Card className="card-shadow animate-fade-in">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
          <Navigation className="h-5 w-5 text-primary" />
          Select Route and Departure date
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
            
            <div className="relative rounded-lg border border-input bg-background transition-colors focus-within:border-primary">
              <label className="absolute left-3 top-2.5 text-xs font-medium text-muted-foreground">
                Departure
              </label>
              <Input
                type="datetime-local"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                min={getMinDateTime()}
                max={getMaxDateTime()}
                className="h-14 border-0 pt-7 pb-2 text-base font-medium focus-visible:ring-0 focus-visible:ring-offset-0"
                required
              />
            </div>
            
            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <Button 
                ref={buttonRef}
                type="submit" 
                className="h-14 w-full lg:w-auto font-medium"
                style={{ width: isLoading && buttonWidth ? buttonWidth : undefined }}
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
                    Get Route and Weather
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
