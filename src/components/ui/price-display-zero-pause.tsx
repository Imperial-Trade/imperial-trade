import React from 'react';
import { useZeroPausePrice } from '@/hooks/useZeroPausePrice';
import { cn } from '@/lib/utils';

interface ZeroPausePriceDisplayProps {
  symbol: string;
  className?: string;
  showChange?: boolean;
  showTimestamp?: boolean;
  precision?: number;
}

export const ZeroPausePriceDisplay: React.FC<ZeroPausePriceDisplayProps> = ({
  symbol,
  className,
  showChange = true,
  showTimestamp = false,
  precision = 2
}) => {
  const { 
    price, 
    change, 
    changePercent, 
    isLoading, 
    error, 
    connectionStatus,
    lastUpdated,
    isPriceStale,
    cacheAge,
    refreshPrice 
  } = useZeroPausePrice(symbol);

  const formatPrice = (value: number) => {
    if (symbol === 'XAUUSD') {
      return value.toFixed(2);
    } else if (symbol === 'BTCUSD') {
      return value.toFixed(0);
    }
    return value.toFixed(precision);
  };

  const getStatusColor = () => {
    if (error) return 'text-destructive';
    if (isPriceStale) return 'text-muted-foreground';
    if (connectionStatus === 'connected') return 'text-primary';
    return 'text-muted-foreground';
  };

  const getChangeColor = () => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-muted-foreground';
  };

  return (
    <div className={cn('flex flex-col space-y-1', className)}>
      {/* Main Price */}
      <div className="flex items-center gap-2">
        <span className={cn('text-2xl font-bold', getStatusColor())}>
          {isLoading ? '---' : formatPrice(price)}
        </span>
        
        {/* Connection Status Indicator */}
        <div className={cn(
          'w-2 h-2 rounded-full',
          connectionStatus === 'connected' && !isPriceStale ? 'bg-green-500' : 
          connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
          'bg-red-500'
        )} />
        
        {/* Staleness Warning */}
        {isPriceStale && (
          <span className="text-xs text-muted-foreground">
            ({cacheAge}s ago)
          </span>
        )}
      </div>

      {/* Change Information */}
      {showChange && !isLoading && (
        <div className="flex items-center gap-2 text-sm">
          <span className={getChangeColor()}>
            {change >= 0 ? '+' : ''}{change.toFixed(precision)}
          </span>
          <span className={getChangeColor()}>
            ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
          </span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-destructive">{error}</span>
          <button 
            onClick={refreshPrice}
            className="text-xs text-primary hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Timestamp */}
      {showTimestamp && lastUpdated && (
        <span className="text-xs text-muted-foreground">
          {lastUpdated.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};