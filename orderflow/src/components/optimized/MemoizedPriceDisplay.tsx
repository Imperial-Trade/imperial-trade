// Phase 3: Memoized Price Display Component for UI Performance
import React, { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { useOptimizedLivePrice } from '@/hooks/useOptimizedLivePrice';

interface PriceDisplayProps {
  symbol: string;
  label?: string;
  showAge?: boolean;
  className?: string;
}

// Phase 3: Memoized component prevents unnecessary re-renders
const PriceDisplayComponent: React.FC<PriceDisplayProps> = ({
  symbol,
  label,
  showAge = true,
  className = ''
}) => {
  const {
    livePrice,
    lastUpdate,
    isConnected,
    dataAge,
    isStale,
    isVeryStale
  } = useOptimizedLivePrice(symbol);

  const formatDataAge = (age: number): string => {
    if (age < 1000) return 'Live';
    if (age < 60000) return `${Math.floor(age / 1000)}s ago`;
    return `${Math.floor(age / 60000)}m ago`;
  };

  const getStatusColor = () => {
    if (!isConnected) return 'bg-red-500';
    if (isVeryStale) return 'bg-red-400';
    if (isStale) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPriceColor = () => {
    if (!isConnected || isVeryStale) return 'text-red-500';
    if (isStale) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex flex-col">
        {label && (
          <span className="text-sm text-muted-foreground">{label}</span>
        )}
        <div className="flex items-center gap-2">
          <span className={`font-mono text-lg font-semibold ${getPriceColor()}`}>
            {livePrice ? `$${livePrice.toFixed(2)}` : '---'}
          </span>
          <Badge
            variant="outline"
            className={`text-white ${getStatusColor()} px-2 py-1 text-xs`}
          >
            {!isConnected ? 'OFFLINE' : 
             isVeryStale ? 'STALE' : 
             formatDataAge(dataAge)}
          </Badge>
        </div>
      </div>
      {showAge && lastUpdate && (
        <div className="text-xs text-muted-foreground">
          Last: {new Date(lastUpdate).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

// Phase 3: React.memo with custom comparison prevents re-renders on irrelevant prop changes
export const MemoizedPriceDisplay = memo(PriceDisplayComponent, (prevProps, nextProps) => {
  return (
    prevProps.symbol === nextProps.symbol &&
    prevProps.label === nextProps.label &&
    prevProps.showAge === nextProps.showAge &&
    prevProps.className === nextProps.className
  );
});

// Default export for convenience
export default MemoizedPriceDisplay;