import React, { memo, useMemo } from 'react';
import { ArrowUp, ArrowDown, Target, XOctagon, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import LivePriceWidget from './LivePriceWidget';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { useSignalTheme } from '@/hooks/useSignalTheme';

interface PriceRowProps {
  label: string;
  value?: number;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  isHit?: boolean;
  compact?: boolean;
}

const PriceRow: React.FC<PriceRowProps> = ({ label, value, icon: Icon, colorClass, isHit = false, compact = false }) => {
  const { colors, isDark } = useSignalTheme();
  
  return (
    <div 
      className={cn(
        "flex justify-between items-center last:border-b-0",
        compact ? "text-xs py-2" : "text-sm py-4",
      )}
      style={{
        borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
        background: isHit ? colors.semantic.success : 'transparent',
      }}
    >
      <div className={cn("flex items-center", compact ? "space-x-2" : "space-x-3")}>
        <Icon className={cn(compact ? "w-4 h-4" : "w-5 h-5", colorClass)} />
        <span className="font-medium" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>{label}</span>
        {isHit && <Check className={cn(compact ? "w-3 h-3" : "w-4 h-4", "text-accent-green")} />}
      </div>
      <span className={`font-mono font-semibold ${isHit ? 'text-accent-green' : ''}`} style={{ color: isHit ? undefined : 'rgba(255, 255, 255, 0.95)' }}>
        {value ? `$${value.toFixed(2)}` : '-'}
      </span>
    </div>
  );
};

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
  compact?: boolean;
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
  status: 'pending' | 'active' | 'closed' | 'partially_profited';
  closeReason?: 'manual' | 'stop_loss' | 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'all_tps_hit' | 'reversal_after_tp' | 'expired';
  compact?: boolean;
}>(({ tradeType, entryPrice, stopLoss, tp1, tp2, tp3, tp4, tp5, tpHitsKey, status, closeReason, compact = false }) => {
  const isBuy = tradeType?.includes('buy') ?? false;
  const takeProfits = [tp1, tp2, tp3, tp4, tp5].filter((tp): tp is number => tp !== undefined);
  const rawHitTPs = (tpHitsKey && tpHitsKey.trim()) ? tpHitsKey.split(',').map(Number).filter(n => !isNaN(n)) : [];
  
  // 🔧 FIX: Fill-down for display - if TP5 is hit, TP1-4 should also show as hit
  // This ensures correct visual representation even if data has gaps
  const maxHitTP = rawHitTPs.length > 0 ? Math.max(...rawHitTPs) : 0;
  const hitTPs = maxHitTP > 0 
    ? Array.from({ length: maxHitTP }, (_, i) => i + 1) // [1,2,3,4,5] if maxHitTP is 5
    : [];

  return (
    <div className={compact ? "mt-1" : "mt-2"}>
      <PriceRow 
        label="Entry Price" 
        value={entryPrice} 
        icon={isBuy ? ArrowUp : ArrowDown} 
        colorClass={isBuy ? "text-accent-green" : "text-accent-red"}
        compact={compact}
      />
      <PriceRow 
        label="Stop Loss" 
        value={stopLoss} 
        icon={XOctagon} 
        colorClass="text-accent-red"
        isHit={closeReason === 'stop_loss'}
        compact={compact}
      />
      {takeProfits.map((tp, index) => {
        const tpLevel = index + 1;
        // Don't show TPs as hit for pending orders - they haven't been activated yet
        const isHit = status !== 'pending' && (hitTPs.includes(tpLevel) || closeReason === `tp${tpLevel}`);
        return (
          <PriceRow 
            key={index} 
            label={`Take Profit ${tpLevel}`} 
            value={tp} 
            icon={Target} 
            colorClass={isHit ? "text-accent-green" : "text-muted-foreground"}
            isHit={isHit}
            compact={compact}
          />
        );
      })}
    </div>
  );
});

const PricePanel: React.FC<PricePanelProps> = ({ 
  id, assetName, symbol, tradeType, entryPrice, stopLoss, 
  tp1, tp2, tp3, tp4, tp5, tpHitsKey, status, closeReason, allowAutomation,
  onTakeProfitHit, onStopLossHit, onOrderActivation,
  compact = false,
}) => {
  const sectionPad = compact ? "px-2 pb-2" : "px-3 pb-3";
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
    tp_hits: (tpHitsKey && typeof tpHitsKey === 'string' && tpHitsKey.trim()) ? tpHitsKey.split(',').map(Number).filter(n => !isNaN(n)) : [],
    status,
    close_reason: closeReason,
    created_date: new Date().toISOString(),
    updated_date: new Date().toISOString()
  }), [id, assetName, symbol, tradeType, entryPrice, stopLoss, tp1, tp2, tp3, tp4, tp5, tpHitsKey, status, closeReason]);

  // For active/pending/partially_profited trades, show LivePriceWidget + static levels
  if (status === 'active' || status === 'pending' || status === 'partially_profited') {
    return (
      <div className={sectionPad}>
        <LivePriceWidget 
          alert={alert} 
          onTakeProfitHit={onTakeProfitHit}
          onStopLossHit={onStopLossHit}
          onOrderActivation={onOrderActivation}
          connectionStatus={connectionStatus === 'disconnected' ? 'error' : connectionStatus}
          priceSource={dataSource || 'WebSocket'}
          compact={compact}
        />
        <StaticLevelsBlock
          compact={compact}
          tradeType={tradeType}
          entryPrice={entryPrice}
          stopLoss={stopLoss}
          tp1={tp1}
          tp2={tp2}
          tp3={tp3}
          tp4={tp4}
          tp5={tp5}
          tpHitsKey={tpHitsKey}
          status={status}
          closeReason={closeReason}
        />
      </div>
    );
  }

  // For closed trades, show only static levels
  return (
    <div className={sectionPad}>
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
        status={status}
        closeReason={closeReason}
        compact={compact}
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