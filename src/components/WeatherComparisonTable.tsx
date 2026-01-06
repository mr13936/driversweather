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
import { getWeatherIconComponent, getWeatherDescription } from '@/lib/weatherUtils';
import { 
  calculateTripAverageScore, 
  getDrivingScoreLabel, 
  getDrivingScoreColor,
  getMinTripScore
} from '@/lib/drivingScore';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const WeatherIconDisplay = ({ symbol }: { symbol: number }) => {
  const IconComponent = getWeatherIconComponent(symbol);
  return <IconComponent className="h-5 w-5 inline-block text-primary" />;
};

interface WeatherComparisonTableProps {
  waypoints: Waypoint[];
  weatherData: Map<number, WeatherData | null>;
  weatherDataOffset: Map<number, WeatherData | null>;
  weatherDataOffset3h: Map<number, WeatherData | null>;
  isLoading3hOffset: boolean;
}

const assessTrip = (
  waypoints: Waypoint[],
  weatherData: Map<number, WeatherData | null>
): { avgTemp: number; maxPrecip: number; maxWind: number } => {
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
  });

  return { 
    avgTemp: totalPoints > 0 ? tempSum / totalPoints : 0,
    maxPrecip,
    maxWind 
  };
};

const ScoreBadge = ({ score }: { score: number | null }) => {
  if (score === null) return <span className="text-muted-foreground">—</span>;
  
  const colors = getDrivingScoreColor(score);
  const label = getDrivingScoreLabel(score);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${colors.bg} ${colors.border} border`}>
            <span className={`text-lg font-bold ${colors.text}`}>{score}</span>
            <span className={`text-xs font-medium ${colors.text}`}>{label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Driving condition score (0-100)</p>
          <p className="text-xs text-muted-foreground">Higher is better</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
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

  // Calculate current trip score
  const currentTripScore = calculateTripAverageScore(weatherData);
  
  // If conditions are excellent (score > 90), show simplified message
  if (currentTripScore !== null && currentTripScore > 90) {
    return (
      <Card className="animate-fade-in">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Departure Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Conditions are excellent — no need to delay your departure.
            </p>
            <ScoreBadge score={currentTripScore} />
          </div>
        </CardContent>
      </Card>
    );
  }

  const offset1hLoadedCount = Array.from(weatherDataOffset.values()).filter(w => w !== null).length;
  const offset3hLoadedCount = Array.from(weatherDataOffset3h.values()).filter(w => w !== null).length;

  // Calculate scores
  const nowScore = calculateTripAverageScore(weatherData);
  const offset1hScore = offset1hLoadedCount > 0 ? calculateTripAverageScore(weatherDataOffset) : null;
  const offset3hScore = offset3hLoadedCount > 0 ? calculateTripAverageScore(weatherDataOffset3h) : null;

  // Calculate min scores (worst conditions)
  const nowMinScore = getMinTripScore(weatherData);
  const offset1hMinScore = offset1hLoadedCount > 0 ? getMinTripScore(weatherDataOffset) : null;
  const offset3hMinScore = offset3hLoadedCount > 0 ? getMinTripScore(weatherDataOffset3h) : null;

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

  // Find best departure time
  const scores = [
    { label: 'Now', score: nowScore },
    { label: '+1h', score: offset1hScore },
    { label: '+3h', score: offset3hScore }
  ].filter(s => s.score !== null);
  
  const bestDeparture = scores.length > 0 
    ? scores.reduce((best, current) => (current.score! > best.score! ? current : best))
    : null;

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Departure Time Comparison</span>
          {bestDeparture && bestDeparture.score !== nowScore && (
            <span className="text-sm font-normal text-muted-foreground">
              Best: <span className="text-primary font-medium">{bestDeparture.label}</span>
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Departure</TableHead>
              <TableHead className="text-center">Conditions</TableHead>
              <TableHead className="text-center">Avg Temp</TableHead>
              <TableHead className="text-center">Max Precip</TableHead>
              <TableHead className="text-center">Max Wind</TableHead>
              <TableHead className="text-center">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Now row */}
            <TableRow className={nowScore === bestDeparture?.score ? 'bg-primary/5' : ''}>
              <TableCell className="font-medium">Now</TableCell>
              <TableCell className="text-center">
                <WeatherIconDisplay symbol={nowSymbol} />
                <span className="ml-2 text-sm text-muted-foreground">{getWeatherDescription(nowSymbol)}</span>
              </TableCell>
              <TableCell className="text-center">{nowAssessment.avgTemp.toFixed(1)}°C</TableCell>
              <TableCell className="text-center">{nowAssessment.maxPrecip.toFixed(1)} mm/h</TableCell>
              <TableCell className="text-center">{nowAssessment.maxWind.toFixed(1)} m/s</TableCell>
              <TableCell className="text-center">
                <ScoreBadge score={nowScore} />
              </TableCell>
            </TableRow>

            {/* +1h row */}
            <TableRow className={offset1hScore === bestDeparture?.score && offset1hScore !== nowScore ? 'bg-primary/5' : ''}>
              <TableCell className="font-medium">+1 hour</TableCell>
              {offset1hAssessment ? (
                <>
                  <TableCell className="text-center">
                    <WeatherIconDisplay symbol={offset1hSymbol!} />
                    <span className="ml-2 text-sm text-muted-foreground">{getWeatherDescription(offset1hSymbol!)}</span>
                  </TableCell>
                  <TableCell className="text-center">{offset1hAssessment.avgTemp.toFixed(1)}°C</TableCell>
                  <TableCell className="text-center">{offset1hAssessment.maxPrecip.toFixed(1)} mm/h</TableCell>
                  <TableCell className="text-center">{offset1hAssessment.maxWind.toFixed(1)} m/s</TableCell>
                  <TableCell className="text-center">
                    <ScoreBadge score={offset1hScore} />
                  </TableCell>
                </>
              ) : (
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                  Loading...
                </TableCell>
              )}
            </TableRow>

            {/* +3h row */}
            <TableRow className={offset3hScore === bestDeparture?.score && offset3hScore !== nowScore ? 'bg-primary/5' : ''}>
              <TableCell className="font-medium">+3 hours</TableCell>
              {isLoading3hOffset ? (
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                  Loading...
                </TableCell>
              ) : offset3hAssessment ? (
                <>
                  <TableCell className="text-center">
                    <WeatherIconDisplay symbol={offset3hSymbol!} />
                    <span className="ml-2 text-sm text-muted-foreground">{getWeatherDescription(offset3hSymbol!)}</span>
                  </TableCell>
                  <TableCell className="text-center">{offset3hAssessment.avgTemp.toFixed(1)}°C</TableCell>
                  <TableCell className="text-center">{offset3hAssessment.maxPrecip.toFixed(1)} mm/h</TableCell>
                  <TableCell className="text-center">{offset3hAssessment.maxWind.toFixed(1)} m/s</TableCell>
                  <TableCell className="text-center">
                    <ScoreBadge score={offset3hScore} />
                  </TableCell>
                </>
              ) : (
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Not available
                </TableCell>
              )}
            </TableRow>
          </TableBody>
        </Table>

        {/* Score legend */}
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground justify-center">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-emerald-500/30"></span> 90+ Excellent
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-500/30"></span> 70-89 Good
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-yellow-500/30"></span> 50-69 Fair
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-orange-500/30"></span> 30-49 Poor
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500/30"></span> 0-29 Hazardous
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
