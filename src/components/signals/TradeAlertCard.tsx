import React, { useState, memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, Target, XOctagon, Lock, Copy, ChevronDown, ChevronUp, Check, Calculator, Share2, User, Crown, GraduationCap } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import QuickCopyPanel from './QuickCopyPanel';
import LivePriceWidget from './LivePriceWidget';
import TradeStatusBadge from './TradeStatusBadge';
import TradingCalculator from './TradingCalculator';
import SignalSharingModal from './SignalSharingModal';
import { TradeAlertCardProps } from '@/types/components';
import { TradeSignal } from '@/services/SignalSharingService';
interface PriceRowProps {
  label: string;
  value?: number;
  icon: React.ComponentType<{
    className?: string;
  }>;
  colorClass: string;
  isHit?: boolean;
}
const PriceRow: React.FC<PriceRowProps> = ({
  label,
  value,
  icon: Icon,
  colorClass,
  isHit = false
}) => <div className={`flex justify-between items-center text-sm py-3 border-b border-emerald-200/30 dark:border-gray-700/50 last:border-b-0 ${isHit ? 'bg-emerald-100/50 dark:bg-emerald-900/20' : ''} transition-colors duration-200`}>
        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
            <Icon className={`w-4 h-4 ${colorClass}`} />
            <span>{label}</span>
            {isHit && <Check className="w-4 h-4 text-emerald-400" />}
        </div>
        <span className={`font-mono font-semibold text-gray-900 dark:text-gray-100 ${isHit ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
          {value ? `$${value.toFixed(2)}` : '-'}
        </span>
    </div>;
const TradeAlertCard: React.FC<TradeAlertCardProps & {
  creator?: {
    id: string;
    display_name: string;
    role: string;
    avatar_url?: string;
  };
}> = ({
  alert,
  onStatusUpdate,
  onTakeProfitHit,
  onStopLossHit,
  onOrderActivation,
  isAdmin,
  isCreator,
  livePrice,
  connectionStatus,
  priceSource,
  isRecentClosure,
  className,
  testId,
  creator
}) => {
  const [showCopyPanel, setShowCopyPanel] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);

  // Type-safe derivations
  const isBuy = alert.trade_type.includes('buy');
  const takeProfits = [alert.tp1, alert.tp2, alert.tp3, alert.tp4, alert.tp5].filter((tp): tp is number => tp !== undefined);
  const hitTPs = alert.tp_hits || [];
  const isClosed = alert.status === 'closed';
  const isPending = alert.status === 'pending';
  const canCloseSignal = isAdmin || isCreator;

  // Convert alert to TradeSignal format for sharing
  const tradeSignal: TradeSignal = {
    id: alert.id,
    assetName: alert.asset_name,
    tradeType: alert.trade_type,
    entryPrice: alert.entry_price,
    stopLoss: alert.stop_loss,
    takeProfits: takeProfits,
    notes: alert.notes || undefined
  };

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

  // Get role icon and color
  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return <Crown className="w-4 h-4 text-yellow-400" />;
      case 'educator':
        return <GraduationCap className="w-4 h-4 text-blue-400" />;
      default:
        return <User className="w-4 h-4 text-gray-400" />;
    }
  };
  const getRoleBadgeClass = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'educator':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  // Get button text based on user role
  const getCloseButtonText = () => {
    if (isAdmin && !isCreator) return 'Close Trade';
    if (isCreator) return 'Close My Signal';
    return 'Close Trade';
  };
  return <div className={`bg-white dark:bg-gray-800/50 rounded-xl border border-emerald-200 dark:border-gray-700 shadow-xl shadow-emerald-500/10 dark:shadow-emerald-500/10 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/20 dark:hover:shadow-emerald-500/10 ${isClosed ? 'opacity-50' : ''} ${isPending ? 'border-amber-400/50 hover:border-amber-400' : 'hover:border-emerald-400/70 dark:hover:border-emerald-400/50'} ${isClosed && (alert.close_reason === 'stop_loss' ? 'ring-2 ring-red-500/30' : hitTPs.length > 0 || alert.close_reason?.startsWith('tp') ? 'ring-2 ring-emerald-500/30' : 'ring-2 ring-gray-500/30')} ${className || ''}`} data-testid={testId}>
      {/* Glowing top indicator for closed trades */}
      {isClosed && <div className={`h-1 w-full ${alert.close_reason === 'stop_loss' ? 'bg-gradient-to-r from-red-500/50 via-red-400/70 to-red-500/50 shadow-lg shadow-red-500/30' : hitTPs.length > 0 || alert.close_reason?.startsWith('tp') ? 'bg-gradient-to-r from-emerald-500/50 via-emerald-400/70 to-emerald-500/50 shadow-lg shadow-emerald-500/30' : 'bg-gradient-to-r from-gray-500/50 via-gray-400/70 to-gray-500/50 shadow-lg shadow-gray-500/30'} animate-pulse`} />}

      <div className="p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 border-l-4 border-emerald-500 shadow-md shadow-emerald-500/20 dark:bg-card/50 dark:backdrop-blur-sm dark:border-border/30 dark:from-transparent dark:to-transparent dark:border-l-0 dark:shadow-none">
        {/* Signal Creator Attribution */}
        {creator && <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 pb-3 border-b border-emerald-200/30 dark:border-gray-700/30">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-sm text-gray-400">
                {getRoleIcon(creator.role)}
                <span>Posted by</span>
              </div>
              <span className="font-semibold text-gray-200">{creator.display_name}</span>
              <Badge className={getRoleBadgeClass(creator.role)}>
                {creator.role.charAt(0).toUpperCase() + creator.role.slice(1)}
              </Badge>
              {isCreator && <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                  Your Signal
                </Badge>}
            </div>
            <div className="text-xs text-gray-500">
              {formatTimeAgo(alert.created_date)}
            </div>
          </div>}

        <div className="flex justify-between items-start">
            <div>
                <h3 className="text-lg font-bold">{alert.asset_name}</h3>
                <Badge className={`${isBuy ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'} mt-1`}>
                    {isBuy ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                    {alert.trade_type.replace('_', ' ').toUpperCase()}
                </Badge>
            </div>
            <div className="flex items-center gap-2 flex-col items-end">
                <TradeStatusBadge alert={alert} updatedDate={alert.updated_date} isRecentClosure={isRecentClosure} />
                <div className="flex gap-1">
                  <Collapsible open={showCopyPanel} onOpenChange={setShowCopyPanel}>
                      <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-sky-400 hover:bg-sky-500/20 hover:text-sky-300" onClick={handleCopyPanelToggle}>
                              <Copy className="w-4 h-4 mr-1" />
                              {showCopyPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </Button>
                      </CollapsibleTrigger>
                  </Collapsible>
                  
                  {/* Share Button */}
                  <SignalSharingModal signal={tradeSignal} trigger={<Button variant="ghost" size="sm" className="text-blue-400 hover:bg-blue-500/20 hover:text-blue-300">
                        <Share2 className="w-4 h-4 mr-1" />
                        <ChevronDown className="w-3 h-3" />
                      </Button>} />
                  
                  {/* Calculator Toggle - Only for active/pending trades */}
                  {(alert.status === 'active' || alert.status === 'pending') && <Collapsible open={showCalculator} onOpenChange={setShowCalculator}>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300" onClick={handleCalculatorToggle}>
                                <Calculator className="w-4 h-4 mr-1" />
                                {showCalculator ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </Button>
                        </CollapsibleTrigger>
                    </Collapsible>}
                </div>
            </div>
        </div>
      </div>

      {/* Live Price Widget - Show for active and pending trades */}
      {(alert.status === 'active' || alert.status === 'pending') && <div className="px-4 pb-4 bg-gradient-to-b from-emerald-50/80 to-emerald-100/60 dark:bg-transparent">
          <LivePriceWidget alert={alert} onTakeProfitHit={onTakeProfitHit} onStopLossHit={onStopLossHit} onOrderActivation={onOrderActivation} livePrice={livePrice} connectionStatus={connectionStatus} priceSource={priceSource} />
        </div>}

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

      <div className="px-4 pb-4 space-y-2 bg-gradient-to-b from-emerald-100/60 to-emerald-150/80 dark:bg-transparent">
        <div className="bg-white/90 backdrop-blur-sm border border-emerald-200/50 dark:bg-gray-900/50 dark:border-gray-700/50 rounded-lg p-4 shadow-sm">
            <PriceRow label="Entry Price" value={alert.entry_price} icon={isBuy ? ArrowUp : ArrowDown} colorClass={isBuy ? "text-emerald-400" : "text-red-400"} />
            <PriceRow label="Stop Loss" value={alert.stop_loss} icon={XOctagon} colorClass={alert.close_reason === 'stop_loss' ? "text-red-300" : "text-red-400"} isHit={alert.close_reason === 'stop_loss'} />
            {takeProfits.map((tp, index) => {
          const tpLevel = index + 1;
          const isHit = hitTPs.includes(tpLevel) || alert.close_reason === `tp${tpLevel}`;
          return <PriceRow key={index} label={`Take Profit ${tpLevel}`} value={tp} icon={Target} colorClass={isHit ? "text-emerald-400" : "text-sky-400"} isHit={isHit} />;
        })}
        </div>
      </div>
      
      {alert.notes && <div className="px-4 pb-4 bg-gradient-to-b from-emerald-150/80 to-emerald-200/60 dark:bg-transparent">
            <p className="text-xs text-gray-600 dark:text-gray-400 italic bg-white/80 backdrop-blur-sm border border-emerald-200/30 dark:bg-gray-900/50 dark:border-gray-700/50 p-3 rounded-lg shadow-sm">"{alert.notes}"</p>
        </div>}

      {/* Stop Loss Proximity Warning */}
      {livePrice && alert.status === 'active' && (() => {
      const entryPrice = alert.entry_price;
      const stopLoss = alert.stop_loss;
      const currentPrice = livePrice;
      if (!entryPrice || !stopLoss) return null;

      // Calculate proximity to stop loss (works for both buy and sell trades)
      const totalDistance = Math.abs(entryPrice - stopLoss);
      const currentDistance = Math.abs(currentPrice - stopLoss);
      const proximityPercentage = (totalDistance - currentDistance) / totalDistance * 100;

      // Only show warning if 50% or closer to stop loss, hide if price goes back to 49% or less
      if (proximityPercentage >= 50) {
        return <div className="px-4 pb-4">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-3 flex items-start gap-2">
                <span className="text-amber-400 mt-0.5 leading-none">🟡</span>
                <div className="text-xs text-amber-300">
                  <span className="font-semibold">Stop-Loss Proximity: {Math.round(proximityPercentage)}%</span>
                  <br />
                  <span className="text-amber-400/80">This trade is more than halfway to its invalidation point.</span>
                </div>
              </div>
            </div>;
      }
      return null;
    })()}
      
      {canCloseSignal && (alert.status === 'active' || alert.status === 'pending') && <div className="bg-gradient-to-r from-emerald-200/40 to-emerald-300/50 backdrop-blur-sm border-t border-emerald-200/30 dark:bg-gray-900/50 dark:border-gray-700/50 px-4 py-3 flex justify-end">
            <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/20 hover:text-red-300" onClick={() => handleStatusUpdate('closed')}>
                <Lock className="w-4 h-4 mr-2" />
                {isPending ? 'Cancel Order' : getCloseButtonText()}
            </Button>
        </div>}
    </div>;
};
export default memo(TradeAlertCard, (prevProps, nextProps) => {
  // Prevent re-renders when only livePrice changes - let LivePriceWidget handle price updates internally
  return prevProps.alert.id === nextProps.alert.id && prevProps.alert.status === nextProps.alert.status && prevProps.alert.asset_name === nextProps.alert.asset_name && prevProps.alert.trade_type === nextProps.alert.trade_type && prevProps.alert.entry_price === nextProps.alert.entry_price && prevProps.alert.stop_loss === nextProps.alert.stop_loss && prevProps.alert.tp1 === nextProps.alert.tp1 && prevProps.alert.tp2 === nextProps.alert.tp2 && prevProps.alert.tp3 === nextProps.alert.tp3 && prevProps.alert.tp4 === nextProps.alert.tp4 && prevProps.alert.tp5 === nextProps.alert.tp5 && prevProps.alert.notes === nextProps.alert.notes && prevProps.alert.close_reason === nextProps.alert.close_reason && prevProps.alert.tp_hits === nextProps.alert.tp_hits && prevProps.isAdmin === nextProps.isAdmin && prevProps.isCreator === nextProps.isCreator && prevProps.isRecentClosure === nextProps.isRecentClosure && prevProps.className === nextProps.className && prevProps.testId === nextProps.testId && JSON.stringify(prevProps.creator) === JSON.stringify(nextProps.creator)
  // Note: livePrice is intentionally excluded to prevent card re-renders on price updates
  ;
});