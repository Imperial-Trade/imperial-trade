import React, { memo, useMemo } from 'react';
import { ArrowUp, ArrowDown, Target, XOctagon, Check } from 'lucide-react';
import LivePriceWidget from './LivePriceWidget';

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
  tradeType: string;
  entryPrice: number;
  stopLoss: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  tp4?: number;
  tp5?: number;
  tpHitsKey: string; // Deduped string like '1,2' or ''
  status: 'pending' | 'active' | 'closed' | 'partially_profited';
  closeReason?: string;
  allowAutomation: boolean;
  onTakeProfitHit?: (alert: any, newTPHits: number[], shouldAutoClose?: boolean, closeReason?: string) => Promise<void>;
  onStopLossHit?: (alert: any, closeReason: string) => Promise<void>;
  onOrderActivation?: (alert: any) => void;
}

const PricePanel: React.FC<PricePanelProps> = ({ 
  id, assetName, symbol, tradeType, entryPrice, stopLoss, 
  tp1, tp2, tp3, tp4, tp5, tpHitsKey, status, closeReason, allowAutomation,
  onTakeProfitHit, onStopLossHit, onOrderActivation 
}) => {
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
    close_reason: closeReason
  }), [id, assetName, symbol, tradeType, entryPrice, stopLoss, tp1, tp2, tp3, tp4, tp5, tpHitsKey, status, closeReason]);

  // For active/pending/partially_profited trades, show LivePriceWidget
  if (status === 'active' || status === 'pending' || status === 'partially_profited') {
    return (
      <div className="px-3 pb-3">
        <LivePriceWidget 
            alert={alert} 
            onTakeProfitHit={onTakeProfitHit}
            onStopLossHit={onStopLossHit}
            onOrderActivation={onOrderActivation}
            allowAutomation={allowAutomation}
        />
      </div>
    );
  }

  // For closed trades, show static price breakdown
  const isBuy = tradeType.includes('buy');
  const takeProfits = [tp1, tp2, tp3, tp4, tp5].filter((tp): tp is number => tp !== undefined);
  const hitTPs = alert.tp_hits || [];

  return (
    <div className="px-3 pb-3 space-y-1.5">
      <div className="bg-muted/50 rounded-md p-2.5">
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
          colorClass={closeReason === 'stop_loss' ? "text-accent-red" : "text-accent-red"}
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