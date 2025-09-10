import React, { memo } from 'react';
import { ArrowUp, ArrowDown, Target, XOctagon, Check } from 'lucide-react';

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

interface Alert {
  id: string;
  trade_type: string;
  entry_price: number;
  stop_loss: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  tp4?: number;
  tp5?: number;
  tp_hits?: number[];
  close_reason?: string;
}

interface PricePanelProps {
  alert: Alert;
}

const PricePanel: React.FC<PricePanelProps> = ({ alert }) => {
  const isBuy = alert.trade_type.includes('buy');
  const takeProfits = [alert.tp1, alert.tp2, alert.tp3, alert.tp4, alert.tp5].filter((tp): tp is number => tp !== undefined);
  const hitTPs = alert.tp_hits || [];

  return (
    <div className="px-3 pb-3 space-y-1.5">
      <div className="bg-muted/50 rounded-md p-2.5">
        <PriceRow 
          label="Entry Price" 
          value={alert.entry_price} 
          icon={isBuy ? ArrowUp : ArrowDown} 
          colorClass={isBuy ? "text-accent-green" : "text-accent-red"} 
        />
        <PriceRow 
          label="Stop Loss" 
          value={alert.stop_loss} 
          icon={XOctagon} 
          colorClass={alert.close_reason === 'stop_loss' ? "text-accent-red" : "text-accent-red"}
          isHit={alert.close_reason === 'stop_loss'}
        />
        {takeProfits.map((tp, index) => {
          const tpLevel = index + 1;
          const isHit = hitTPs.includes(tpLevel) || alert.close_reason === `tp${tpLevel}`;
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
  // Only re-render if price levels or hits change
  return (
    prevProps.alert.id === nextProps.alert.id &&
    prevProps.alert.trade_type === nextProps.alert.trade_type &&
    prevProps.alert.entry_price === nextProps.alert.entry_price &&
    prevProps.alert.stop_loss === nextProps.alert.stop_loss &&
    prevProps.alert.tp1 === nextProps.alert.tp1 &&
    prevProps.alert.tp2 === nextProps.alert.tp2 &&
    prevProps.alert.tp3 === nextProps.alert.tp3 &&
    prevProps.alert.tp4 === nextProps.alert.tp4 &&
    prevProps.alert.tp5 === nextProps.alert.tp5 &&
    JSON.stringify(prevProps.alert.tp_hits) === JSON.stringify(nextProps.alert.tp_hits) &&
    prevProps.alert.close_reason === nextProps.alert.close_reason
  );
});