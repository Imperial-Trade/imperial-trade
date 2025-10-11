import React, { useMemo, useState, useEffect } from 'react';
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

  const [pulseKey, setPulseKey] = useState(0);

  // 🚀 PHASE 4: Trigger pulse animation on data updates
  useEffect(() => {
    if (connectionQuality === 'live') {
      setPulseKey(prev => prev + 1);
    }
  }, [connectionQuality, dataAge]);

  // 🚀 PHASE 4: Enhanced status with data source indicators
  const indicatorProps = useMemo(() => {
    const baseAge = dataAge || 0;
    
    switch (connectionQuality) {
      case 'live':
        return {
          variant: 'default' as const,
          icon: Wifi,
          color: 'text-green-400',
          bgColor: 'bg-green-400/20',
          title: `🟢 Live (${isStale ? 'interpolating' : 'polling 2s'})`,
          label: isStale ? 'Interpolating' : 'Live',
          pulse: !isStale
        };
      case 'hydrated':
        return {
          variant: 'secondary' as const,
          icon: Wifi,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-400/20',
          title: '🟡 Hydrated (loading fresh data...)',
          label: 'Hydrated',
          pulse: true
        };
      case 'stale':
        return {
          variant: 'destructive' as const,
          icon: WifiOff,
          color: 'text-red-400',
          bgColor: 'bg-red-400/20',
          title: `🔴 Stale (${baseAge}ms old)`,
          label: 'Stale',
          pulse: false
        };
      default:
        return {
          variant: 'outline' as const,
          icon: WifiOff,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted',
          title: 'No data available',
          label: 'Offline',
          pulse: false
        };
    }
  }, [connectionQuality, dataAge, isStale]);

  // 🚀 Priority 5: Performance Monitoring (Dev Mode Only)
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 LivePriceIndicator ${symbol}: ${connectionQuality}`);
    }
  }, [symbol, connectionQuality]);

  return (
    <div className="flex items-center gap-1.5">
      <Badge 
        key={pulseKey}
        variant={indicatorProps.variant}
        className={`${className} ${indicatorProps.color} ${indicatorProps.bgColor} ${indicatorProps.pulse ? 'animate-pulse' : ''} transition-all duration-300`}
        title={indicatorProps.title}
        style={{ willChange: 'transform' }}
      >
        <indicatorProps.icon className="w-3 h-3 mr-1" />
        <span className="text-xs font-medium">{indicatorProps.label}</span>
      </Badge>
      {/* 🚀 PHASE 4: Visual data freshness indicator */}
      <div 
        className={`w-2 h-2 rounded-full ${indicatorProps.bgColor.replace('/20', '/60')} ${indicatorProps.pulse ? 'animate-pulse' : ''}`}
        title={`Data age: ${dataAge}ms`}
      />
    </div>
  );
};