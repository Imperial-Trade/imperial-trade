import React, { memo, useMemo } from 'react';
import { ArrowUp, ArrowDown, Target, XOctagon, Check } from 'lucide-react';
import LivePriceWidget from './LivePriceWidget';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';

interface PriceRowProps {
  label: string;
  value?: number;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  isHit?: boolean;
}

const PriceRow: React.FC<PriceRowProps> = ({ label, value, icon: Icon, colorClass, isHit = false }) => (
  <div className={`flex justify-between items-center text-sm py-2 border-b border-border/50 last:border-b-0 ${isHit ? 'bg-accent-green/20' : ''}`}>
    <div className="flex items-center space-x-2 text-muted-foreground">
      <Icon className={`w-4 h-4 ${colorClass}`} />
      <span>{label}</span>
      {isHit && <Check className="w-4 h-4 text-accent-green" />}
    </div>
    <span className={`font-mono font-semibold text-foreground ${isHit ? 'text-accent-green' : ''}`}>
      {value ? `$${value.toFixed(2)}` : '-'}
    </span>
  </div>
);

import { TradeAlertWithProfile } from '@/utils/dataTransformers';

interface PricePanelProps {
  alert: TradeAlertWithProfile;
  livePrice: number;
}

// Static levels block component - memoized to prevent unnecessary re-renders
const StaticLevelsBlock = memo<{
  tradeType: 'buy' | 'sell' | 'buy_limit' | 'sell_limit';
  entryPrice: number;
  stopLoss: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  tp4?: number;
  tp5?: number;
  tpHitsKey: string;
  closeReason?: 'manual' | 'stop_loss' | 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'all_tps_hit' | 'reversal_after_tp' | 'expired';
}>(({ tradeType, entryPrice, stopLoss, tp1, tp2, tp3, tp4, tp5, tpHitsKey, closeReason }) => {
  const isBuy = tradeType.includes('buy');
  const takeProfits = [tp1, tp2, tp3, tp4, tp5].filter((tp): tp is number => tp !== undefined);
  const hitTPs = tpHitsKey ? tpHitsKey.split(',').map(Number).filter(n => !isNaN(n)) : [];

  return (
    <div className="bg-muted/50 rounded-md p-2.5 mt-2">
      <PriceRow 
        label="Entry Price" 
        value={entryPrice} 
        icon={isBuy ? ArrowUp : ArrowDown} 
        colorClass={isBuy ? "text-accent-green" : "text-accent-red"} 
      />
      <PriceRow 
        label="Stop Loss" 
        value={stopLoss} 
        icon={XOctagon} 
        colorClass="text-accent-red"
        isHit={closeReason === 'stop_loss'}
      />
      {takeProfits.map((tp, index) => {
        const tpLevel = index + 1;
        const isHit = hitTPs.includes(tpLevel) || closeReason === `tp${tpLevel}`;
        return (
          <PriceRow 
            key={index} 
            label={`Take Profit ${tpLevel}`} 
            value={tp} 
            icon={Target} 
            colorClass={isHit ? "text-accent-green" : "text-accent-blue"}
            isHit={isHit}
          />
        );
      })}
    </div>
  );
});

const PricePanel: React.FC<PricePanelProps> = ({ alert, livePrice }) => {
  // Get connection status and data source from WebSocket context
  const { connectionStatus, dataSource } = useOptimizedWebSocketPrices();
  
  const tpHitsKey = alert.tpHits ? alert.tpHits.join(',') : '';

  // For active/pending/partially_profited trades, show static levels only (LivePriceWidget handled elsewhere)
  if (alert.status === 'active' || alert.status === 'pending' || alert.status === 'partially_profited') {
    return (
      <div className="px-3 pb-3">
        <StaticLevelsBlock
          tradeType={alert.tradeType}
          entryPrice={alert.entryPrice}
          stopLoss={alert.stopLoss}
          tp1={alert.tp1}
          tp2={alert.tp2}
          tp3={alert.tp3}
          tp4={alert.tp4}
          tp5={alert.tp5}
          tpHitsKey={tpHitsKey}
          closeReason={alert.closeReason}
        />
      </div>
    );
  }

  // For closed trades, show only static levels
  return (
    <div className="px-3 pb-3">
      <StaticLevelsBlock
        tradeType={alert.tradeType}
        entryPrice={alert.entryPrice}
        stopLoss={alert.stopLoss}
        tp1={alert.tp1}
        tp2={alert.tp2}
        tp3={alert.tp3}
        tp4={alert.tp4}
        tp5={alert.tp5}
        tpHitsKey={tpHitsKey}
        closeReason={alert.closeReason}
      />
    </div>
  );
};

export default memo(PricePanel, (prevProps, nextProps) => {
  // Compare alert and livePrice
  return (
    prevProps.alert.id === nextProps.alert.id &&
    prevProps.alert.status === nextProps.alert.status &&
    prevProps.alert.tpHits?.join(',') === nextProps.alert.tpHits?.join(',') &&
    prevProps.alert.closeReason === nextProps.alert.closeReason &&
    prevProps.livePrice === nextProps.livePrice
  );
});