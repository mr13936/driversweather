import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { WeatherData, Waypoint } from '@/lib/apiUtils';
import { getWeatherIcon, getWeatherDescription } from '@/lib/weatherUtils';
import { Badge } from '@/components/ui/badge';

interface WeatherComparisonTableProps {
  waypoints: Waypoint[];
  weatherData: Map<number, WeatherData | null>;
  weatherDataOffset: Map<number, WeatherData | null>;
  weatherDataOffset3h: Map<number, WeatherData | null>;
  isLoading3hOffset: boolean;
}

type SeverityLevel = 'good' | 'caution' | 'warning';

const getConditionSeverity = (weather: WeatherData): SeverityLevel => {
  if (
    weather.precipitationIntensity > 4 ||
    weather.visibility < 3 ||
    weather.windSpeed > 20 ||
    (weather.weatherSymbol >= 20 && weather.weatherSymbol <= 27)
  ) {
    return 'warning';
  }
  
  if (
    weather.precipitationIntensity > 2 ||
    weather.visibility < 5 ||
    weather.windSpeed > 15 ||
    (weather.weatherSymbol >= 10 && weather.weatherSymbol <= 19)
  ) {
    return 'caution';
  }
  
  return 'good';
};

const getSeverityBadge = (severity: SeverityLevel) => {
  switch (severity) {
    case 'good':
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Good</Badge>;
    case 'caution':
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Caution</Badge>;
    case 'warning':
      return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">Warning</Badge>;
  }
};

const assessTrip = (
  waypoints: Waypoint[],
  weatherData: Map<number, WeatherData | null>
): { severity: SeverityLevel; avgTemp: number; maxPrecip: number; maxWind: number } => {
  let warningCount = 0;
  let cautionCount = 0;
  let totalPoints = 0;
  let tempSum = 0;
  let maxPrecip = 0;
  let maxWind = 0;

  waypoints.forEach((_, index) => {
    const weather = weatherData.get(index);
    if (!weather) return;
    totalPoints++;
    tempSum += weather.temperature;
    maxPrecip = Math.max(maxPrecip, weather.precipitationIntensity);
    maxWind = Math.max(maxWind, weather.windSpeed);

    const severity = getConditionSeverity(weather);
    if (severity === 'warning') warningCount++;
    else if (severity === 'caution') cautionCount++;
  });

  let severity: SeverityLevel = 'good';
  if (warningCount > 0) {
    severity = warningCount >= totalPoints * 0.3 ? 'warning' : 'caution';
  } else if (cautionCount > 0) {
    severity = cautionCount >= totalPoints * 0.4 ? 'caution' : 'good';
  }

  return { 
    severity, 
    avgTemp: totalPoints > 0 ? tempSum / totalPoints : 0,
    maxPrecip,
    maxWind 
  };
};

export const WeatherComparisonTable = ({
  waypoints,
  weatherData,
  weatherDataOffset,
  weatherDataOffset3h,
  isLoading3hOffset,
}: WeatherComparisonTableProps) => {
  const loadedCount = Array.from(weatherData.values()).filter(w => w !== null).length;
  
  if (loadedCount === 0 || waypoints.length === 0) return null;

  const offset1hLoadedCount = Array.from(weatherDataOffset.values()).filter(w => w !== null).length;
  const offset3hLoadedCount = Array.from(weatherDataOffset3h.values()).filter(w => w !== null).length;

  const nowAssessment = assessTrip(waypoints, weatherData);
  const offset1hAssessment = offset1hLoadedCount > 0 ? assessTrip(waypoints, weatherDataOffset) : null;
  const offset3hAssessment = offset3hLoadedCount > 0 ? assessTrip(waypoints, weatherDataOffset3h) : null;

  // Get representative weather icons
  const getCommonWeatherSymbol = (data: Map<number, WeatherData | null>): number => {
    const symbols: number[] = [];
    data.forEach(weather => {
      if (weather) symbols.push(weather.weatherSymbol);
    });
    if (symbols.length === 0) return 1;
    // Return the most severe (highest) symbol
    return Math.max(...symbols);
  };

  const nowSymbol = getCommonWeatherSymbol(weatherData);
  const offset1hSymbol = offset1hLoadedCount > 0 ? getCommonWeatherSymbol(weatherDataOffset) : null;
  const offset3hSymbol = offset3hLoadedCount > 0 ? getCommonWeatherSymbol(weatherDataOffset3h) : null;

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Wait Time Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Departure</TableHead>
              <TableHead className="text-center">Conditions</TableHead>
              <TableHead className="text-center">Avg Temp</TableHead>
              <TableHead className="text-center">Max Precip</TableHead>
              <TableHead className="text-center">Max Wind</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Now row */}
            <TableRow>
              <TableCell className="font-medium">Now</TableCell>
              <TableCell className="text-center">
                <span className="text-lg">{getWeatherIcon(nowSymbol)}</span>
                <span className="ml-2 text-sm text-muted-foreground">{getWeatherDescription(nowSymbol)}</span>
              </TableCell>
              <TableCell className="text-center">{nowAssessment.avgTemp.toFixed(1)}°C</TableCell>
              <TableCell className="text-center">{nowAssessment.maxPrecip.toFixed(1)} mm/h</TableCell>
              <TableCell className="text-center">{nowAssessment.maxWind.toFixed(1)} m/s</TableCell>
              <TableCell className="text-center">{getSeverityBadge(nowAssessment.severity)}</TableCell>
            </TableRow>

            {/* +1h row */}
            <TableRow>
              <TableCell className="font-medium">+1 hour</TableCell>
              {offset1hAssessment ? (
                <>
                  <TableCell className="text-center">
                    <span className="text-lg">{getWeatherIcon(offset1hSymbol!)}</span>
                    <span className="ml-2 text-sm text-muted-foreground">{getWeatherDescription(offset1hSymbol!)}</span>
                  </TableCell>
                  <TableCell className="text-center">{offset1hAssessment.avgTemp.toFixed(1)}°C</TableCell>
                  <TableCell className="text-center">{offset1hAssessment.maxPrecip.toFixed(1)} mm/h</TableCell>
                  <TableCell className="text-center">{offset1hAssessment.maxWind.toFixed(1)} m/s</TableCell>
                  <TableCell className="text-center">{getSeverityBadge(offset1hAssessment.severity)}</TableCell>
                </>
              ) : (
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                  Loading...
                </TableCell>
              )}
            </TableRow>

            {/* +3h row */}
            <TableRow>
              <TableCell className="font-medium">+3 hours</TableCell>
              {isLoading3hOffset ? (
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                  Loading...
                </TableCell>
              ) : offset3hAssessment ? (
                <>
                  <TableCell className="text-center">
                    <span className="text-lg">{getWeatherIcon(offset3hSymbol!)}</span>
                    <span className="ml-2 text-sm text-muted-foreground">{getWeatherDescription(offset3hSymbol!)}</span>
                  </TableCell>
                  <TableCell className="text-center">{offset3hAssessment.avgTemp.toFixed(1)}°C</TableCell>
                  <TableCell className="text-center">{offset3hAssessment.maxPrecip.toFixed(1)} mm/h</TableCell>
                  <TableCell className="text-center">{offset3hAssessment.maxWind.toFixed(1)} m/s</TableCell>
                  <TableCell className="text-center">{getSeverityBadge(offset3hAssessment.severity)}</TableCell>
                </>
              ) : (
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Not available
                </TableCell>
              )}
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
