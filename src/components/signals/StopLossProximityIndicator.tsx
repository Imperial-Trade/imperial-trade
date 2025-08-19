import React, { memo } from 'react';
import { useOptimizedLivePrice } from '@/hooks/useOptimizedLivePrice';
import type { TradeAlertData } from '@/types/components';

interface StopLossProximityIndicatorProps {
  alert: TradeAlertData;
  thresholdPercent?: number; // default 50%
}

const StopLossProximityIndicatorComponent: React.FC<StopLossProximityIndicatorProps> = ({ alert, thresholdPercent = 50 }) => {
  if (alert.status !== 'active') return null;

  const { price } = useOptimizedLivePrice(alert.tradermade_symbol, { debounceMs: 200 });

  const entry = alert.entry_price;
  const stopLoss = alert.stop_loss;
  const currentPrice = price || 0;

  if (!entry || !stopLoss || !currentPrice) return null;
  const totalDistance = Math.abs(entry - stopLoss);
  if (totalDistance === 0) return null;
  const currentDistance = Math.abs(currentPrice - stopLoss);
  const proximityPercentage = ((totalDistance - currentDistance) / totalDistance) * 100;

  if (proximityPercentage < thresholdPercent) return null;

  return (
    <div className="px-4 pb-4">
      <div className="bg-accent-gold/10 border border-accent-gold/30 rounded-md p-3 flex items-start gap-2">
        <span className="text-accent-gold mt-0.5 leading-none">🟡</span>
        <div className="text-xs text-accent-gold">
          <span className="font-semibold">Stop-Loss Proximity: {Math.round(proximityPercentage)}%</span>
          <br />
          <span className="text-accent-gold/80">This trade is more than halfway to its invalidation point.</span>
        </div>
      </div>
    </div>
  );
};

export default memo(StopLossProximityIndicatorComponent, (prev, next) => {
  return (
    prev.alert.id === next.alert.id &&
    prev.alert.entry_price === next.alert.entry_price &&
    prev.alert.stop_loss === next.alert.stop_loss &&
    prev.alert.status === next.alert.status &&
    prev.alert.tradermade_symbol === next.alert.tradermade_symbol &&
    prev.thresholdPercent === next.thresholdPercent
  );
});
