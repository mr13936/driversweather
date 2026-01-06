import logo from '@/assets/logo.png';

interface LoadingSplashProps {
  stage: 'route' | 'weather' | 'preparing';
  progress: { current: number; total: number };
}

export const LoadingSplash = ({ stage, progress }: LoadingSplashProps) => {
  const getStatusText = () => {
    switch (stage) {
      case 'route':
        return 'Calculating route...';
      case 'weather':
        return `Fetching weather data... (${progress.current}/${progress.total})`;
      case 'preparing':
        return 'Preparing results...';
      default:
        return 'Loading...';
    }
  };

  const getProgressPercentage = () => {
    if (stage === 'route') return 20;
    if (stage === 'weather') {
      const weatherProgress = progress.total > 0 
        ? (progress.current / progress.total) * 60 
        : 0;
      return 20 + weatherProgress;
    }
    return 90;
  };

  return (
    <div className="flex flex-col items-center justify-start -mt-32 pt-8 animate-fade-in relative z-10">
      <div className="bg-card border border-border rounded-2xl p-8 shadow-lg max-w-md w-full mx-4">
        {/* Animated Logo */}
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 animate-pulse">
            <img 
              src={logo} 
              alt="Loading" 
              className="h-full w-full object-contain"
            />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>

        {/* Status Text */}
        <div className="text-center">
          <p className="text-foreground font-medium">
            {getStatusText()}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {stage === 'route' && 'Finding the best path for your journey'}
            {stage === 'weather' && 'Checking conditions along your route'}
            {stage === 'preparing' && 'Almost ready!'}
          </p>
        </div>

        {/* Loading Dots Animation */}
        <div className="flex justify-center gap-1 mt-4">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};
