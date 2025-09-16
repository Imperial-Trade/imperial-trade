import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';
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
          icon: Wifi,
          color: 'text-green-400',
          title: 'Live updates active - real-time data'
        };
      case 'hydrated':
        return {
          variant: 'secondary' as const,
          icon: Wifi,
          color: 'text-yellow-400',
          title: 'Database data - loading live updates'
        };
      case 'stale':
        return {
          variant: 'destructive' as const,
          icon: WifiOff,
          color: 'text-red-400',
          title: 'Connection issues - data may be outdated'
        };
      default:
        return {
          variant: 'outline' as const,
          icon: WifiOff,
          color: 'text-muted-foreground',
          title: 'No data available'
        };
    }
  };

  const indicator = getIndicatorProps();

  return (
    <Badge 
      variant={indicator.variant}
      className={`${className} ${indicator.color} transition-colors duration-200`}
      title={indicator.title}
    >
      <indicator.icon className="w-3 h-3" />
    </Badge>
  );
};