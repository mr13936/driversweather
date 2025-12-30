import { useState } from 'react';
import { Calendar, Navigation, Loader2 } from 'lucide-react';
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
  
  // Default to current time rounded to the nearest hour
  const getDefaultDateTime = () => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    return now.toISOString().slice(0, 16);
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">From</label>
              <CityAutocomplete
                value={from}
                onChange={setFrom}
                placeholder="Departure city"
                iconColor="text-muted-foreground"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">To</label>
              <CityAutocomplete
                value={to}
                onChange={setTo}
                placeholder="Destination city"
                iconColor="text-primary"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Departure Time</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="datetime-local"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
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
