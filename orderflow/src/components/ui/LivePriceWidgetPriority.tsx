import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Activity, Timer, Zap } from 'lucide-react';
import { useOptimizedLivePrice } from '@/hooks/useOptimizedLivePrice';

interface LivePriceWidgetPriorityProps {
  symbol: string;
  showDetails?: boolean;
  className?: string;
}

/**
 * Enhanced Live Price Widget with Priority Status
 * Shows update frequency and bypass status for trading widgets
 */
export const LivePriceWidgetPriority: React.FC<LivePriceWidgetPriorityProps> = ({ 
  symbol, 
  showDetails = false,
  className 
}) => {
  const { price, dataAge, isLoading } = useOptimizedLivePrice(symbol, {
    trackDataAge: true, // Enable priority handling for live price widgets
    debounceMs: 50 // Ultra-low latency for trading widgets
  });

  // Determine widget priority status
  const priorityStatus = useMemo(() => {
    const isFresh = dataAge <= 2000; // ≤2 seconds is considered fresh
    const isRealTime = dataAge <= 5000; // ≤5 seconds is considered real-time
    
    if (isLoading) {
      return {
        status: 'loading',
        icon: Timer,
        variant: 'outline' as const,
        label: 'Loading...',
        color: 'text-muted-foreground'
      };
    }
    
    if (isFresh && isRealTime) {
      return {
        status: 'live',
        icon: Zap,
        variant: 'default' as const,
        label: 'Live Priority',
        color: 'text-green-400'
      };
    }
    
    if (isRealTime) {
      return {
        status: 'active',
        icon: Activity,
        variant: 'secondary' as const,
        label: 'Active',
        color: 'text-blue-400'
      };
    }
    
    return {
      status: 'stale',
      icon: Timer,
      variant: 'destructive' as const,
      label: 'Delayed',
      color: 'text-red-400'
    };
  }, [dataAge, isLoading]);

  const formattedDataAge = useMemo(() => {
    if (dataAge < 1000) return `${Math.round(dataAge)}ms`;
    return `${Math.round(dataAge / 1000)}s`;
  }, [dataAge]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge 
        variant={priorityStatus.variant}
        className={`${priorityStatus.color} flex items-center gap-1`}
        title={`Data age: ${formattedDataAge} - Status: Live Price Widget`}
      >
        <priorityStatus.icon className="w-3 h-3" />
        {showDetails && (
          <span className="text-xs">
            {priorityStatus.label} ({formattedDataAge})
          </span>
        )}
      </Badge>
      
      {price && (
        <span className="text-sm font-mono">
          {price.toFixed(symbol.includes('JPY') ? 3 : 5)}
        </span>
      )}
    </div>
  );
};