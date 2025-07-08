
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, Target, XOctagon, Lock, Copy, ChevronDown, ChevronUp, Check, Calculator } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import QuickCopyPanel from './QuickCopyPanel';
import LivePriceWidget from './LivePriceWidget';
import TradeStatusBadge from './TradeStatusBadge';
import TradingCalculator from './TradingCalculator';
import { TradeAlertCardProps } from '@/types/components';

interface PriceRowProps {
  label: string;
  value?: number;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  isHit?: boolean;
}

const PriceRow: React.FC<PriceRowProps> = ({ label, value, icon: Icon, colorClass, isHit = false }) => (
    <div className={`flex justify-between items-center text-sm py-2 border-b border-gray-700/50 last:border-b-0 ${isHit ? 'bg-emerald-900/20' : ''}`}>
        <div className="flex items-center space-x-2 text-gray-400">
            <Icon className={`w-4 h-4 ${colorClass}`} />
            <span>{label}</span>
            {isHit && <Check className="w-4 h-4 text-emerald-400" />}
        </div>
        <span className={`font-mono font-semibold ${isHit ? 'text-emerald-400' : ''}`}>
          {value ? `$${value.toFixed(2)}` : '-'}
        </span>
    </div>
);

const TradeAlertCard: React.FC<TradeAlertCardProps> = ({ 
  alert, 
  onStatusUpdate, 
  onTakeProfitHit, 
  onStopLossHit, 
  onOrderActivation, 
  isAdmin, 
  livePrice, 
  connectionStatus, 
  priceSource, 
  isRecentClosure,
  className,
  testId 
}) => {
  const [showCopyPanel, setShowCopyPanel] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  
  // Type-safe derivations
  const isBuy = alert.trade_type.includes('buy');
  const takeProfits = [alert.tp1, alert.tp2, alert.tp3, alert.tp4, alert.tp5].filter((tp): tp is number => tp !== undefined);
  const hitTPs = alert.tp_hits || [];
  const isClosed = alert.status === 'closed';
  const isPending = alert.status === 'pending';

  // Type-safe event handlers
  const handleStatusUpdate = async (newStatus: string) => {
    try {
      await onStatusUpdate(alert, newStatus);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleCopyPanelToggle = () => {
    setShowCopyPanel(prev => !prev);
  };

  const handleCalculatorToggle = () => {
    setShowCalculator(prev => !prev);
  };

  return (
    <div 
      className={`bg-gray-800/50 rounded-lg border border-gray-700 shadow-lg overflow-hidden transition-all duration-300 hover:shadow-emerald-500/10 ${isClosed ? 'opacity-50' : ''} ${isPending ? 'border-amber-400/50 hover:border-amber-400' : 'hover:border-emerald-400/50'} ${isClosed && (alert.close_reason === 'stop_loss' ? 'ring-2 ring-red-500/30' : hitTPs.length > 0 || alert.close_reason?.startsWith('tp') ? 'ring-2 ring-emerald-500/30' : 'ring-2 ring-gray-500/30')} ${className || ''}`}
      data-testid={testId}
    >
      {/* Glowing top indicator for closed trades */}
      {isClosed && (
        <div className={`h-1 w-full ${
          alert.close_reason === 'stop_loss' 
            ? 'bg-gradient-to-r from-red-500/50 via-red-400/70 to-red-500/50 shadow-lg shadow-red-500/30' 
            : (hitTPs.length > 0 || alert.close_reason?.startsWith('tp'))
              ? 'bg-gradient-to-r from-emerald-500/50 via-emerald-400/70 to-emerald-500/50 shadow-lg shadow-emerald-500/30'
              : 'bg-gradient-to-r from-gray-500/50 via-gray-400/70 to-gray-500/50 shadow-lg shadow-gray-500/30'
        } animate-pulse`} />
      )}

      <div className="p-4">
        <div className="flex justify-between items-start">
            <div>
                <h3 className="text-lg font-bold">{alert.asset_name}</h3>
                <Badge className={`${isBuy ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'} mt-1`}>
                    {isBuy ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                    {alert.trade_type.replace('_', ' ').toUpperCase()}
                </Badge>
            </div>
            <div className="flex items-center gap-2 flex-col items-end">
                <TradeStatusBadge 
                  alert={alert} 
                  updatedDate={alert.updated_date} 
                  isRecentClosure={isRecentClosure} 
                />
                <div className="flex gap-1">
                  <Collapsible open={showCopyPanel} onOpenChange={setShowCopyPanel}>
                      <CollapsibleTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-sky-400 hover:bg-sky-500/20 hover:text-sky-300"
                            onClick={handleCopyPanelToggle}
                          >
                              <Copy className="w-4 h-4 mr-1" />
                              {showCopyPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </Button>
                      </CollapsibleTrigger>
                  </Collapsible>
                  
                  {/* Calculator Toggle - Only for active/pending trades */}
                  {(alert.status === 'active' || alert.status === 'pending') && (
                    <Collapsible open={showCalculator} onOpenChange={setShowCalculator}>
                        <CollapsibleTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"
                              onClick={handleCalculatorToggle}
                            >
                                <Calculator className="w-4 h-4 mr-1" />
                                {showCalculator ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </Button>
                        </CollapsibleTrigger>
                    </Collapsible>
                  )}
                </div>
            </div>
        </div>
      </div>

      {/* Live Price Widget - Show for active and pending trades */}
      {(alert.status === 'active' || alert.status === 'pending') && (
        <div className="px-4 pb-4">
          <LivePriceWidget 
              alert={alert} 
              onTakeProfitHit={onTakeProfitHit}
              onStopLossHit={onStopLossHit}
              onOrderActivation={onOrderActivation}
              livePrice={livePrice}
              connectionStatus={connectionStatus}
              priceSource={priceSource}
          />
        </div>
      )}

      <Collapsible open={showCopyPanel} onOpenChange={setShowCopyPanel}>
        <CollapsibleContent className="px-4 pb-4">
            <QuickCopyPanel alert={alert} />
        </CollapsibleContent>
      </Collapsible>

      {/* Trading Calculator */}
      <Collapsible open={showCalculator} onOpenChange={setShowCalculator}>
        <CollapsibleContent className="px-4 pb-4">
            <TradingCalculator alert={alert} livePrice={livePrice} />
        </CollapsibleContent>
      </Collapsible>

      <div className="px-4 pb-4 space-y-2">
        <div className="bg-gray-900/50 rounded-md p-3">
            <PriceRow 
              label="Entry Price" 
              value={alert.entry_price} 
              icon={isBuy ? ArrowUp : ArrowDown} 
              colorClass={isBuy ? "text-emerald-400" : "text-red-400"} 
            />
            <PriceRow 
              label="Stop Loss" 
              value={alert.stop_loss} 
              icon={XOctagon} 
              colorClass={alert.close_reason === 'stop_loss' ? "text-red-300" : "text-red-400"}
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
                  colorClass={isHit ? "text-emerald-400" : "text-sky-400"}
                  isHit={isHit}
                />
              );
            })}
        </div>
      </div>
      
      {alert.notes && (
        <div className="px-4 pb-4">
            <p className="text-xs text-gray-400 italic bg-gray-900/50 p-2 rounded-md">"{alert.notes}"</p>
        </div>
      )}
      
      {isAdmin && (alert.status === 'active' || alert.status === 'pending') && (
        <div className="bg-gray-900/50 px-4 py-2 flex justify-end">
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-red-400 hover:bg-red-500/20 hover:text-red-300" 
              onClick={() => handleStatusUpdate('closed')}
            >
                <Lock className="w-4 h-4 mr-2" />
                {isPending ? 'Cancel Order' : 'Close Trade'}
            </Button>
        </div>
      )}
    </div>
  );
};

export default TradeAlertCard;
