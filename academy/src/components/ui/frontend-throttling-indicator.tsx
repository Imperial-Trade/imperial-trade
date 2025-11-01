import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Activity, Clock, Zap } from 'lucide-react';
import { usePriceStalenessMonitor } from '@/hooks/usePriceStalenessMonitor';

interface FrontendThrottlingIndicatorProps {
  symbol: string;
  showDetails?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

export const FrontendThrottlingIndicator: React.FC<FrontendThrottlingIndicatorProps> = ({
  symbol,
  showDetails = false,
  size = 'default'
}) => {
  const stalenessStatus = usePriceStalenessMonitor(symbol, 6);
  
  const getIndicatorConfig = () => {
    switch (stalenessStatus.dataFreshness) {
      case 'live':
        return {
          icon: <Zap className="w-3 h-3" />,
          variant: 'default' as const,
          label: 'Live',
          description: 'Real-time updates active - prices updating instantly',
          color: 'text-green-500'
        };
      case 'throttled':
        return {
          icon: <Activity className="w-3 h-3" />,
          variant: 'secondary' as const,
          label: 'Smooth',
          description: 'Professional mode - prices updating every 3-4 seconds for calm trading',
          color: 'text-blue-500'
        };
      case 'stale':
        return {
          icon: <Clock className="w-3 h-3" />,
          variant: 'destructive' as const,
          label: 'Delayed',
          description: 'Price updates delayed - check connection',
          color: 'text-red-500'
        };
    }
  };

  const config = getIndicatorConfig();

  const content = (
    <Badge variant={config.variant} className="gap-1">
      <span className={config.color}>
        {config.icon}
      </span>
      {config.label}
      {showDetails && stalenessStatus.ageInSeconds && (
        <span className="ml-1 text-xs opacity-75">
          {stalenessStatus.ageInSeconds}s
        </span>
      )}
    </Badge>
  );

  if (showDetails) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <p className="font-medium">{config.description}</p>
              {stalenessStatus.uiThrottled && (
                <p className="text-xs opacity-75 mt-1">
                  Backend data is fresh, UI updates are smoothed
                </p>
              )}
              {stalenessStatus.ageInSeconds && (
                <p className="text-xs opacity-75 mt-1">
                  Last update: {stalenessStatus.ageInSeconds} seconds ago
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
};

export default FrontendThrottlingIndicator;