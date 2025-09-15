import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useEnhancedLivePrice } from '@/hooks/useLivePrice';

interface LivePriceIndicatorProps {
  symbol: string;
  className?: string;
}

export const LivePriceIndicator: React.FC<LivePriceIndicatorProps> = ({ 
  symbol, 
  className 
}) => {
  const { connectionQuality, dataAge, isStale } = useEnhancedLivePrice(symbol);

  const getIndicatorProps = () => {
    switch (connectionQuality) {
      case 'live':
        return {
          variant: 'default' as const,
          label: '●',
          title: 'Live updates active - real-time data'
        };
      case 'hydrated':
        return {
          variant: 'secondary' as const,
          label: '●',
          title: 'Database data - loading live updates'
        };
      case 'stale':
        return {
          variant: 'destructive' as const,
          label: '●',
          title: 'Connection issues - data may be outdated'
        };
      default:
        return {
          variant: 'outline' as const,
          label: '●',
          title: 'No data available'
        };
    }
  };

  const indicator = getIndicatorProps();

  return (
    <Badge 
      variant={indicator.variant}
      className={className}
      title={indicator.title}
    >
      {indicator.label}
    </Badge>
  );
};