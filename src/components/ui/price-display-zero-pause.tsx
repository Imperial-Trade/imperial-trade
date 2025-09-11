import React, { useState, useEffect } from 'react';
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
  const [lastPrice, setLastPrice] = useState<number | null>(null);

  // Update last price when we receive a valid price
  useEffect(() => {
    if (price && price > 0) {
      setLastPrice(price);
    }
  }, [price]);

  const formatPrice = (value: number | null) => {
    if (!value) return '---';
    if (symbol === 'XAUUSD') {
      return value.toFixed(2);
    } else if (symbol === 'BTCUSD') {
      return value.toFixed(0);
    }
    return value.toFixed(precision);
  };

  // Use current price if available, otherwise fallback to last known price
  const displayPrice = price && price > 0 ? price : lastPrice;

  return (
    <div className={cn('flex flex-col space-y-1', className)}>
      {/* Main Price */}
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold text-accent-green">
          {formatPrice(displayPrice)}
        </span>
        
        {/* Connection Status Indicator */}
        <div className={cn(
          'w-2 h-2 rounded-full',
          price && price > 0 ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
        )} />
      </div>

      {/* Timestamp */}
      {showTimestamp && displayPrice && (
        <span className="text-xs text-muted-foreground">
          {new Date().toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};