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

// PHASE C: Minimal, stable primitive props for price panel
interface PricePanelProps {
  id: string;
  assetName: string;
  symbol: string;
  tradeType: 'buy' | 'sell' | 'buy_limit' | 'sell_limit';
  entryPrice: number;
  stopLoss: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  tp4?: number;
  tp5?: number;
  tpHitsKey: string; // Deduped string like '1,2' or ''
  status: 'pending' | 'active' | 'closed' | 'partially_profited';
  closeReason?: 'manual' | 'stop_loss' | 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'all_tps_hit' | 'reversal_after_tp' | 'expired';
  allowAutomation: boolean;
  onTakeProfitHit?: (alert: any, newTPHits: number[], shouldAutoClose?: boolean, closeReason?: string) => Promise<void>;
  onStopLossHit?: (alert: any, closeReason: string) => Promise<void>;
  onOrderActivation?: (alert: any) => Promise<void>;
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

const PricePanel: React.FC<PricePanelProps> = ({ 
  id, assetName, symbol, tradeType, entryPrice, stopLoss, 
  tp1, tp2, tp3, tp4, tp5, tpHitsKey, status, closeReason, allowAutomation,
  onTakeProfitHit, onStopLossHit, onOrderActivation 
}) => {
  // Get connection status and data source from WebSocket context
  const { connectionStatus, dataSource } = useOptimizedWebSocketPrices();
  // PHASE C: Reconstruct alert object with useMemo - stable reference unless primitives change
  const alert = useMemo(() => ({
    id,
    asset_name: assetName,
    tradermade_symbol: symbol,
    trade_type: tradeType,
    entry_price: entryPrice,
    stop_loss: stopLoss,
    tp1, tp2, tp3, tp4, tp5,
    tp_hits: tpHitsKey ? tpHitsKey.split(',').map(Number).filter(n => !isNaN(n)) : [],
    status,
    close_reason: closeReason,
    created_date: new Date().toISOString(),
    updated_date: new Date().toISOString()
  }), [id, assetName, symbol, tradeType, entryPrice, stopLoss, tp1, tp2, tp3, tp4, tp5, tpHitsKey, status, closeReason]);

  // For active/pending/partially_profited trades, show LivePriceWidget + static levels
  if (status === 'active' || status === 'pending' || status === 'partially_profited') {
    return (
      <div className="px-3 pb-3">
        <LivePriceWidget 
          symbol={alert.tradermade_symbol} 
          className="mb-2"
        />
        <StaticLevelsBlock
          tradeType={tradeType}
          entryPrice={entryPrice}
          stopLoss={stopLoss}
          tp1={tp1}
          tp2={tp2}
          tp3={tp3}
          tp4={tp4}
          tp5={tp5}
          tpHitsKey={tpHitsKey}
          closeReason={closeReason}
        />
      </div>
    );
  }

  // For closed trades, show only static levels
  return (
    <div className="px-3 pb-3">
      <StaticLevelsBlock
        tradeType={tradeType}
        entryPrice={entryPrice}
        stopLoss={stopLoss}
        tp1={tp1}
        tp2={tp2}
        tp3={tp3}
        tp4={tp4}
        tp5={tp5}
        tpHitsKey={tpHitsKey}
        closeReason={closeReason}
      />
    </div>
  );
};

export default memo(PricePanel, (prevProps, nextProps) => {
  // PHASE C: Compare primitive props only - no complex object comparisons
  return (
    prevProps.id === nextProps.id &&
    prevProps.assetName === nextProps.assetName &&
    prevProps.symbol === nextProps.symbol &&
    prevProps.tradeType === nextProps.tradeType &&
    prevProps.entryPrice === nextProps.entryPrice &&
    prevProps.stopLoss === nextProps.stopLoss &&
    prevProps.tp1 === nextProps.tp1 &&
    prevProps.tp2 === nextProps.tp2 &&
    prevProps.tp3 === nextProps.tp3 &&
    prevProps.tp4 === nextProps.tp4 &&
    prevProps.tp5 === nextProps.tp5 &&
    prevProps.tpHitsKey === nextProps.tpHitsKey &&
    prevProps.status === nextProps.status &&
    prevProps.closeReason === nextProps.closeReason &&
    prevProps.allowAutomation === nextProps.allowAutomation
  );
});