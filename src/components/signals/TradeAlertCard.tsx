import React, { useState } from 'react';
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
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  isHit?: boolean;
}

const PriceRow: React.FC<PriceRowProps> = ({ label, value, icon: Icon, colorClass, isHit = false }) => (
    <div className={`flex justify-between items-center text-sm py-2 border-b border-border/30 last:border-b-0 ${isHit ? 'bg-primary/10' : ''}`}>
        <div className="flex items-center space-x-2 text-muted-foreground">
            <Icon className={`w-4 h-4 ${colorClass}`} />
            <span>{label}</span>
            {isHit && <Check className="w-4 h-4 text-primary" />}
        </div>
        <span className={`font-mono font-semibold ${isHit ? 'text-primary' : 'text-foreground'}`}>
          {value ? `$${value.toFixed(2)}` : '-'}
        </span>
    </div>
);

const TradeAlertCard: React.FC<TradeAlertCardProps & { creator?: { id: string; display_name: string; role: string; avatar_url?: string } }> = ({ 
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
        return <Crown className="w-4 h-4 text-accent" />;
      case 'educator':
        return <GraduationCap className="w-4 h-4 text-primary" />;
      default:
        return <User className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-accent/20 text-accent border-accent/30';
      case 'educator':
        return 'bg-primary/20 text-primary border-primary/30';
      default:
        return 'bg-muted/20 text-muted-foreground border-muted/30';
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

  return (
    <div 
      className={`bg-card/80 backdrop-blur-sm rounded-lg border border-border/40 shadow-lg overflow-hidden transition-all duration-300 hover:shadow-primary/10 hover:border-lightGreenHover dark:hover:border-primary/30 ${isClosed ? 'opacity-50' : ''} ${isPending ? 'border-accent/50 hover:border-accent' : ''} ${isClosed && (alert.close_reason === 'stop_loss' ? 'ring-2 ring-destructive/30' : hitTPs.length > 0 || alert.close_reason?.startsWith('tp') ? 'ring-2 ring-primary/30' : 'ring-2 ring-muted/30')} ${className || ''}`}
      data-testid={testId}
    >
      {/* Glowing top indicator for closed trades */}
      {isClosed && (
        <div className={`h-1 w-full ${
          alert.close_reason === 'stop_loss' 
            ? 'bg-gradient-to-r from-destructive/50 via-destructive/70 to-destructive/50 shadow-lg shadow-destructive/30' 
            : (hitTPs.length > 0 || alert.close_reason?.startsWith('tp'))
              ? 'bg-gradient-to-r from-primary/50 via-primary/70 to-primary/50 shadow-lg shadow-primary/30'
              : 'bg-gradient-to-r from-muted/50 via-muted/70 to-muted/50 shadow-lg shadow-muted/30'
        } animate-pulse`} />
      )}

      <div className="p-4">
        {/* Signal Creator Attribution */}
        {creator && (
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-border/30">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                {getRoleIcon(creator.role)}
                <span>Posted by</span>
              </div>
              <span className="font-semibold text-foreground">{creator.display_name}</span>
              <Badge className={getRoleBadgeClass(creator.role)}>
                {creator.role.charAt(0).toUpperCase() + creator.role.slice(1)}
              </Badge>
              {isCreator && (
                <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                  Your Signal
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatTimeAgo(alert.created_date)}
            </div>
          </div>
        )}

        <div className="flex justify-between items-start">
            <div>
                <h3 className="text-lg font-bold text-foreground">{alert.asset_name}</h3>
                <Badge className={`${isBuy ? 'bg-primary/20 text-primary border-primary/30' : 'bg-destructive/20 text-destructive border-destructive/30'} mt-1`}>
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
                            className="text-primary hover:bg-primary/20 hover:text-primary/90 transition-colors"
                            onClick={handleCopyPanelToggle}
                          >
                              <Copy className="w-4 h-4 mr-1" />
                              {showCopyPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </Button>
                      </CollapsibleTrigger>
                  </Collapsible>
                  
                  {/* Share Button */}
                  <SignalSharingModal 
                    signal={tradeSignal}
                    trigger={
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-accent hover:bg-accent/20 hover:text-accent/90 transition-colors"
                      >
                        <Share2 className="w-4 h-4 mr-1" />
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    }
                  />
                  
                  {/* Calculator Toggle - Only for active/pending trades */}
                  {(alert.status === 'active' || alert.status === 'pending') && (
                    <Collapsible open={showCalculator} onOpenChange={setShowCalculator}>
                        <CollapsibleTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-primary hover:bg-primary/20 hover:text-primary/90 transition-colors"
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
        <div className="bg-muted/30 backdrop-blur-sm rounded-md p-3 border border-border/20">
            <PriceRow 
              label="Entry Price" 
              value={alert.entry_price} 
              icon={isBuy ? ArrowUp : ArrowDown} 
              colorClass={isBuy ? "text-primary" : "text-destructive"} 
            />
            <PriceRow 
              label="Stop Loss" 
              value={alert.stop_loss} 
              icon={XOctagon} 
              colorClass={alert.close_reason === 'stop_loss' ? "text-destructive" : "text-destructive/70"}
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
                  colorClass={isHit ? "text-primary" : "text-accent"}
                  isHit={isHit}
                />
              );
            })}
        </div>
      </div>
      
      {alert.notes && (
        <div className="px-4 pb-4">
            <p className="text-xs text-muted-foreground italic bg-muted/30 p-2 rounded-md border border-border/20">"{alert.notes}"</p>
        </div>
      )}
      
      {canCloseSignal && (alert.status === 'active' || alert.status === 'pending') && (
        <div className="bg-muted/30 backdrop-blur-sm px-4 py-2 flex justify-end border-t border-border/20">
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-destructive hover:bg-destructive/20 hover:text-destructive/90 transition-colors" 
              onClick={() => handleStatusUpdate('closed')}
            >
                <Lock className="w-4 h-4 mr-2" />
                {isPending ? 'Cancel Order' : getCloseButtonText()}
            </Button>
        </div>
      )}
    </div>
  );
};

export default TradeAlertCard;
