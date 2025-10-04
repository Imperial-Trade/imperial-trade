import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';
import { useEnhancedLivePrice } from '@/hooks/useLivePrice';
import { useConnectionStability } from '@/hooks/useConnectionStability';

interface LivePriceIndicatorProps {
  symbol: string;
  className?: string;
}

export const LivePriceIndicator: React.FC<LivePriceIndicatorProps> = ({ 
  symbol, 
  className 
}) => {
  const { connectionQuality, dataAge, isStale } = useEnhancedLivePrice(symbol);
  const { shouldAllowQualityChange } = useConnectionStability({
    stabilityThreshold: 10000, // 10 seconds  
    cooldownPeriod: 2000 // 2 seconds
  });

  // 🚀 PHASE 5: Show aggressive polling status (2s with 1s burst)
  const indicatorProps = useMemo(() => {
    switch (connectionQuality) {
      case 'live':
      case 'hydrated':
        return {
          variant: 'default' as const,
          icon: Wifi,
          color: 'text-blue-400',
          title: 'Database polling active (2s updates with interpolation)'
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