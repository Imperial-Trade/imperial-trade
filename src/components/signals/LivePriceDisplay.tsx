import React, { memo, useMemo } from 'react';
import { useOptimizedLivePrice } from '@/hooks/useOptimizedLivePrice';

interface LivePriceDisplayProps {
  symbol: string;
  className?: string;
  prefix?: string; // e.g. '$'
}

function formatPriceAmount(price: number): string {
  if (!price || !isFinite(price)) return '0.0000';
  if (price >= 1000) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  }
  if (price >= 1) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(price);
  }
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  }).format(price);
}

const LivePriceDisplayComponent: React.FC<LivePriceDisplayProps> = ({ symbol, className, prefix = '$' }) => {
  const { price } = useOptimizedLivePrice(symbol, { debounceMs: 150 });
  const formatted = useMemo(() => formatPriceAmount(price || 0), [price]);

  return (
    <span className={`font-mono tabular-nums text-foreground ${className || ''}`}>{prefix}{formatted}</span>
  );
};

export default memo(LivePriceDisplayComponent, (prev, next) => {
  return prev.symbol === next.symbol && prev.className === next.className && prev.prefix === next.prefix;
});
