import React from 'react';
import { useLivePrice } from '@/hooks/useLivePrice';
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
  const price = useLivePrice(symbol);

  const formatPrice = (value: number | null) => {
    if (!value) return '---';
    if (symbol === 'XAUUSD') {
      return value.toFixed(2);
    } else if (symbol === 'BTCUSD') {
      return value.toFixed(0);
    }
    return value.toFixed(precision);
  };

  return (
    <div className={cn('flex flex-col space-y-1', className)}>
      {/* Main Price */}
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold text-accent-green">
          {formatPrice(price)}
        </span>
        
        {/* Connection Status Indicator */}
        <div className={cn(
          'w-2 h-2 rounded-full',
          price ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
        )} />
      </div>

      {/* Loading state */}
      {!price && (
        <span className="text-xs text-muted-foreground">
          Loading live price...
        </span>
      )}

      {/* Timestamp */}
      {showTimestamp && price && (
        <span className="text-xs text-muted-foreground">
          {new Date().toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};