import React, { memo } from 'react';
import { useOptimizedLivePrice } from '@/hooks/useOptimizedLivePrice';

interface StopLossProximityIndicatorProps {
  symbol: string;
  entryPrice: number;
  stopLoss: number;
  assetName: string;
  className?: string;
}

const StopLossProximityIndicator: React.FC<StopLossProximityIndicatorProps> = ({
  symbol,
  entryPrice,
  stopLoss,
  assetName,
  className = ''
}) => {
  const { price: currentPrice } = useOptimizedLivePrice(symbol, {
    debounceMs: 200,
    enableSmartPausing: false
  });

  // Calculate proximity percentage
  if (!entryPrice || !stopLoss || !currentPrice || currentPrice === 0) {
    return null;
  }

  const totalDistance = Math.abs(entryPrice - stopLoss);
  if (totalDistance === 0) return null;

  const currentDistance = Math.abs(currentPrice - stopLoss);
  const proximityPercentage = ((totalDistance - currentDistance) / totalDistance) * 100;

  // Only show warning if more than 50% to stop loss
  if (proximityPercentage < 50) {
    return null;
  }

  return (
    <div className={`bg-accent-gold/10 border border-accent-gold/30 rounded-md p-3 flex items-start gap-2 ${className}`}>
      <span className="text-accent-gold mt-0.5 leading-none">🟡</span>
      <div className="text-xs text-accent-gold">
        <span className="font-semibold">Stop-Loss Proximity: {Math.round(proximityPercentage)}%</span>
        <br />
        <span className="text-accent-gold/80">This trade is more than halfway to its invalidation point.</span>
      </div>
    </div>
  );
};

export default memo(StopLossProximityIndicator, (prevProps, nextProps) => {
  // Re-render if any core props change
  return (
    prevProps.symbol === nextProps.symbol &&
    prevProps.entryPrice === nextProps.entryPrice &&
    prevProps.stopLoss === nextProps.stopLoss &&
    prevProps.assetName === nextProps.assetName &&
    prevProps.className === nextProps.className
  );
});