import React, { useMemo } from 'react';
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

  // 🚀 Priority 3: Optimize UI Rendering Strategy with useMemo
  const indicatorProps = useMemo(() => {
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
  }, [connectionQuality]);

  // 🚀 Priority 5: Performance Monitoring (Dev Mode Only)
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 LivePriceIndicator ${symbol}: ${connectionQuality}`);
    }
  }, [symbol, connectionQuality]);

  return (
    <Badge 
      variant={indicatorProps.variant}
      className={`${className} ${indicatorProps.color}`}
      title={indicatorProps.title}
      style={{ willChange: 'transform' }}
    >
      <indicatorProps.icon className="w-3 h-3" />
    </Badge>
  );
};