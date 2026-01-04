import { WeatherData } from './apiUtils';

export interface ScoreBreakdown {
  precipitation: number;
  visibility: number;
  wind: number;
  surfaceRisk: number;
  total: number;
}

export type ScoreLabel = 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Hazardous';

/**
 * Calculate precipitation penalty (0-40 points)
 * Based on intensity and type
 */
const calculatePrecipitationPenalty = (
  intensity: number,
  precipType: number,
  temperature: number
): number => {
  let basePenalty = 0;
  
  // Base penalty from intensity (mm/h)
  if (intensity <= 0) {
    basePenalty = 0;
  } else if (intensity <= 0.5) {
    basePenalty = 3;
  } else if (intensity <= 1) {
    basePenalty = 7;
  } else if (intensity <= 2) {
    basePenalty = 12;
  } else if (intensity <= 4) {
    basePenalty = 18;
  } else if (intensity <= 8) {
    basePenalty = 28;
  } else {
    basePenalty = 40;
  }
  
  if (basePenalty === 0) return 0;
  
  // Multiplier based on precipitation type (SMHI pcat values)
  // 0=None, 1=Snow, 2=Sleet, 3=Rain, 4=Drizzle, 5=Freezing rain, 6=Freezing drizzle
  let multiplier = 1.0;
  switch (precipType) {
    case 1: // Snow
      multiplier = 1.2;
      break;
    case 2: // Sleet
      multiplier = 1.3;
      break;
    case 3: // Rain
      multiplier = 1.0;
      break;
    case 4: // Drizzle
      multiplier = 0.8;
      break;
    case 5: // Freezing rain
      multiplier = 1.5;
      break;
    case 6: // Freezing drizzle
      multiplier = 1.4;
      break;
    default:
      // Infer from temperature if type is unknown
      if (temperature < 0 && intensity > 0) {
        multiplier = 1.2; // Assume snow/ice conditions
      }
  }
  
  return Math.min(40, Math.round(basePenalty * multiplier));
};

/**
 * Calculate visibility penalty (0-25 points)
 * Based on visibility in km
 */
const calculateVisibilityPenalty = (visibility: number): number => {
  if (visibility >= 10) return 0;
  if (visibility >= 5) return 5;
  if (visibility >= 2) return 10;
  if (visibility >= 1) return 15;
  if (visibility >= 0.5) return 20;
  return 25;
};

/**
 * Calculate wind penalty (0-20 points)
 * Based on wind speed in m/s
 */
const calculateWindPenalty = (windSpeed: number): number => {
  if (windSpeed < 5) return 0;
  if (windSpeed < 10) return 5;
  if (windSpeed < 15) return 10;
  if (windSpeed < 20) return 15;
  return 20;
};

/**
 * Calculate surface risk penalty (0-15 points)
 * Based on temperature when precipitation is present
 */
const calculateSurfaceRiskPenalty = (
  temperature: number,
  precipitationIntensity: number
): number => {
  // No surface risk if no precipitation
  if (precipitationIntensity <= 0) {
    // Still penalize for very cold temps (black ice potential)
    if (temperature < -10) return 5;
    if (temperature < 0) return 3;
    return 0;
  }
  
  // With precipitation, temperature affects road conditions
  if (temperature > 5) return 0; // Wet but safe
  if (temperature > 0) return 5; // Potential slippery
  if (temperature > -5) return 10; // Likely ice/snow accumulation
  return 15; // Persistent ice, reduced tire grip
};

/**
 * Calculate the driving condition score (0-100)
 * Higher scores = better driving conditions
 */
export const calculateDrivingScore = (weather: WeatherData): number => {
  const precipPenalty = calculatePrecipitationPenalty(
    weather.precipitationIntensity,
    weather.precipitationType,
    weather.temperature
  );
  const visibilityPenalty = calculateVisibilityPenalty(weather.visibility);
  const windPenalty = calculateWindPenalty(weather.windSpeed);
  const surfacePenalty = calculateSurfaceRiskPenalty(
    weather.temperature,
    weather.precipitationIntensity
  );
  
  const totalPenalty = precipPenalty + visibilityPenalty + windPenalty + surfacePenalty;
  return Math.max(0, 100 - totalPenalty);
};

/**
 * Get detailed breakdown of score penalties
 */
export const getScoreBreakdown = (weather: WeatherData): ScoreBreakdown => {
  const precipitation = calculatePrecipitationPenalty(
    weather.precipitationIntensity,
    weather.precipitationType,
    weather.temperature
  );
  const visibility = calculateVisibilityPenalty(weather.visibility);
  const wind = calculateWindPenalty(weather.windSpeed);
  const surfaceRisk = calculateSurfaceRiskPenalty(
    weather.temperature,
    weather.precipitationIntensity
  );
  
  return {
    precipitation,
    visibility,
    wind,
    surfaceRisk,
    total: precipitation + visibility + wind + surfaceRisk
  };
};

/**
 * Get human-readable label for a score
 */
export const getDrivingScoreLabel = (score: number): ScoreLabel => {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 30) return 'Poor';
  return 'Hazardous';
};

/**
 * Get color class for a score (returns Tailwind classes)
 */
export const getDrivingScoreColor = (score: number): {
  bg: string;
  text: string;
  border: string;
} => {
  if (score >= 90) {
    return {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-500/30'
    };
  }
  if (score >= 70) {
    return {
      bg: 'bg-green-500/10',
      text: 'text-green-600 dark:text-green-400',
      border: 'border-green-500/30'
    };
  }
  if (score >= 50) {
    return {
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-600 dark:text-yellow-400',
      border: 'border-yellow-500/30'
    };
  }
  if (score >= 30) {
    return {
      bg: 'bg-orange-500/10',
      text: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-500/30'
    };
  }
  return {
    bg: 'bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-500/30'
  };
};

/**
 * Calculate average trip score from weather data map
 */
export const calculateTripAverageScore = (
  weatherData: Map<number, WeatherData | null>
): number | null => {
  const scores: number[] = [];
  
  weatherData.forEach((weather) => {
    if (weather) {
      scores.push(calculateDrivingScore(weather));
    }
  });
  
  if (scores.length === 0) return null;
  
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
};

/**
 * Get the minimum (worst) score from a weather data map
 */
export const getMinTripScore = (
  weatherData: Map<number, WeatherData | null>
): number | null => {
  let minScore: number | null = null;
  
  weatherData.forEach((weather) => {
    if (weather) {
      const score = calculateDrivingScore(weather);
      if (minScore === null || score < minScore) {
        minScore = score;
      }
    }
  });
  
  return minScore;
};

/**
 * Format breakdown for display in tooltip
 */
export const formatBreakdownForDisplay = (breakdown: ScoreBreakdown): string[] => {
  const lines: string[] = [];
  
  if (breakdown.precipitation > 0) {
    lines.push(`Precipitation: -${breakdown.precipitation}`);
  }
  if (breakdown.visibility > 0) {
    lines.push(`Visibility: -${breakdown.visibility}`);
  }
  if (breakdown.wind > 0) {
    lines.push(`Wind: -${breakdown.wind}`);
  }
  if (breakdown.surfaceRisk > 0) {
    lines.push(`Surface risk: -${breakdown.surfaceRisk}`);
  }
  
  if (lines.length === 0) {
    lines.push('No penalties - optimal conditions');
  }
  
  return lines;
};
