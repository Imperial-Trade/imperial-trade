
import React, { useState, memo, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, Target, XOctagon, Lock, Copy, ChevronDown, ChevronUp, Check, Calculator, Share2, User, Crown, GraduationCap, Pencil } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import QuickCopyPanel from './QuickCopyPanel';
import { ZeroLatencyLivePriceWidget } from './ZeroLatencyLivePriceWidget';
import TradeStatusBadge from './TradeStatusBadge';
import TradingCalculator from './TradingCalculator';
import SignalSharingModal from './SignalSharingModal';
import { TradeAlertCardProps } from '@/types/components';
import { TradeSignal } from '@/services/SignalSharingService';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useWebSocketPrices } from '@/contexts/WebSocketPriceContext';

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
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(alert.notes || '');
  const [localNotes, setLocalNotes] = useState(alert.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  
  useEffect(() => {
    setLocalNotes(alert.notes || '');
    setNotesDraft(alert.notes || '');
  }, [alert.id, alert.notes]);
  
  // Type-safe derivations
  const isBuy = alert.trade_type.includes('buy');
  const takeProfits = [alert.tp1, alert.tp2, alert.tp3, alert.tp4, alert.tp5].filter((tp): tp is number => tp !== undefined);
  const hitTPs = alert.tp_hits || [];
  const isClosed = alert.status === 'closed';
  const isPending = alert.status === 'pending';
  const canCloseSignal = isCreator;
  const canEditNotes = isCreator && (alert.status === 'active' || alert.status === 'pending');
  const { getPrice } = useWebSocketPrices();

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

  const handleNotesEditToggle = () => {
    setIsEditingNotes(prev => !prev);
    setNotesDraft(localNotes || '');
  };

  const handleNotesSave = async () => {
    try {
      setIsSavingNotes(true);
      const { error } = await supabase
        .from('trade_alerts')
        .update({ notes: notesDraft })
        .eq('id', alert.id);

      if (error) throw error;

      setLocalNotes(notesDraft);
      setIsEditingNotes(false);
      toast({ title: 'Notes updated', description: 'Everyone can now see the new notes.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to update notes', description: e?.message || 'Please try again.' });
    } finally {
      setIsSavingNotes(false);
    }
  };
  // Get role icon and color
  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return <Crown className="w-4 h-4 text-accent-gold" />;
      case 'educator':
        return <GraduationCap className="w-4 h-4 text-accent-blue" />;
      default:
        return <User className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-accent-gold/20 text-accent-gold border-accent-gold/30';
      case 'educator':
        return 'bg-accent-blue/20 text-accent-blue border-accent-blue/30';
      default:
        return 'bg-muted/20 text-muted-foreground border-border/30';
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

  // Get button text (only creator can close in stream)
  const getCloseButtonText = () => 'Close My Signal';

  return (
    <div 
      className={`bg-card rounded-lg border border-border shadow-lg overflow-hidden transition-all duration-300 hover:shadow-accent-green/10 ${isClosed ? 'opacity-50' : ''} ${isPending ? 'border-accent-gold/50 hover:border-accent-gold' : 'hover:border-accent-green/50'} ${isClosed && (alert.close_reason === 'stop_loss' ? 'ring-2 ring-accent-red/30' : hitTPs.length > 0 || alert.close_reason?.startsWith('tp') ? 'ring-2 ring-accent-green/30' : 'ring-2 ring-border/30')} ${className || ''}`}
      data-testid={testId}
    >
      {/* Glowing top indicator for closed trades */}
      {isClosed && (
        <div className={`h-1 w-full ${
          alert.close_reason === 'stop_loss' 
            ? 'bg-gradient-to-r from-accent-red/50 via-accent-red/70 to-accent-red/50 shadow-lg shadow-accent-red/30' 
            : (hitTPs.length > 0 || alert.close_reason?.startsWith('tp'))
              ? 'bg-gradient-to-r from-accent-green/50 via-accent-green/70 to-accent-green/50 shadow-lg shadow-accent-green/30'
              : 'bg-gradient-to-r from-muted-foreground/50 via-muted-foreground/70 to-muted-foreground/50 shadow-lg shadow-muted-foreground/30'
        } animate-pulse`} />
      )}

      <div className="p-4">
        {/* Signal Creator Attribution */}
        {creator && (
          <div className="flex items-start justify-between mb-3 pb-3 border-b border-border/30">
            <div className="flex items-center gap-2">
              {getRoleIcon(creator.role)}
              <span className="font-semibold text-foreground">{creator.display_name}</span>
              <Badge className={getRoleBadgeClass(creator.role)}>
                {creator.role.charAt(0).toUpperCase() + creator.role.slice(1)}
              </Badge>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="text-xs text-muted-foreground">
                {formatTimeAgo(alert.created_date)}
              </div>
            </div>
          </div>
        )}

        {/* Currency Pair and Status */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold">{alert.asset_name}</h3>
              <TradeStatusBadge 
                alert={alert} 
                updatedDate={alert.updated_date} 
                isRecentClosure={isRecentClosure} 
              />
            </div>
          </div>

          {/* Actions - moved to the right */}
          <div className="flex items-center gap-2 flex-wrap" data-prevent-widget-open="true">
            {/* Copy Button */}
            <Collapsible open={showCopyPanel} onOpenChange={setShowCopyPanel}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-accent-blue hover:bg-accent-blue/20 hover:text-accent-blue"
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
                  className="text-accent-blue hover:bg-accent-blue/20 hover:text-accent-blue"
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
                    className="text-accent-green hover:bg-accent-green/20 hover:text-accent-green"
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

      {/* Live Price Widget - Show for active and pending trades */}
      {(alert.status === 'active' || alert.status === 'pending') && (
        <div className="px-4 pb-4">
          <ZeroLatencyLivePriceWidget 
              alert={alert} 
              onTakeProfitHit={onTakeProfitHit}
              onStopLossHit={onStopLossHit}
              onOrderActivation={onOrderActivation}
          />
        </div>
      )}

      <Collapsible open={showCopyPanel} onOpenChange={setShowCopyPanel}>
        <CollapsibleContent className="px-4 pb-4" data-prevent-widget-open="true">
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
        <div className="bg-muted/50 rounded-md p-3">
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
      
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground">Notes</span>
          {canEditNotes && !isEditingNotes && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-accent-blue hover:bg-accent-blue/20 hover:text-accent-blue" 
              onClick={handleNotesEditToggle}
            >
              <Pencil className="w-3 h-3 mr-1" /> Edit
            </Button>
          )}
        </div>
        {isEditingNotes ? (
          <div className="space-y-2">
            <Textarea 
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Add helpful context for followers..."
              className="min-h-[80px]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={handleNotesEditToggle} disabled={isSavingNotes}>Cancel</Button>
              <Button variant="default" size="sm" onClick={handleNotesSave} disabled={isSavingNotes || notesDraft === localNotes}>
                {isSavingNotes ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic bg-muted/50 p-2 rounded-md">{localNotes ? `"${localNotes}"` : '—'}</p>
        )}
      </div>
      {/* Stop Loss Proximity Warning */}
      {alert.status === 'active' && (() => {
        const wsPrice = getPrice?.(alert.tradermade_symbol)?.price;
        const currentPrice = typeof livePrice === 'number' ? livePrice : (typeof wsPrice === 'number' ? wsPrice : null);
        const entryPrice = alert.entry_price;
        const stopLoss = alert.stop_loss;
        if (!entryPrice || !stopLoss || !currentPrice) return null;
        const totalDistance = Math.abs(entryPrice - stopLoss);
        if (totalDistance === 0) return null;
        const currentDistance = Math.abs(currentPrice - stopLoss);
        const proximityPercentage = ((totalDistance - currentDistance) / totalDistance) * 100;
        if (proximityPercentage >= 50) {
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
        }
        return null;
      })()}
      
      {canCloseSignal && (alert.status === 'active' || alert.status === 'pending') && (
        <div className="bg-muted/50 px-4 py-2 flex justify-end">
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-accent-red hover:bg-accent-red/20 hover:text-accent-red" 
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

export default memo(TradeAlertCard, (prevProps, nextProps) => {
  // Prevent re-renders when only livePrice changes - let LivePriceWidget handle price updates internally
  return (
    prevProps.alert.id === nextProps.alert.id &&
    prevProps.alert.status === nextProps.alert.status &&
    prevProps.alert.asset_name === nextProps.alert.asset_name &&
    prevProps.alert.trade_type === nextProps.alert.trade_type &&
    prevProps.alert.entry_price === nextProps.alert.entry_price &&
    prevProps.alert.stop_loss === nextProps.alert.stop_loss &&
    prevProps.alert.tp1 === nextProps.alert.tp1 &&
    prevProps.alert.tp2 === nextProps.alert.tp2 &&
    prevProps.alert.tp3 === nextProps.alert.tp3 &&
    prevProps.alert.tp4 === nextProps.alert.tp4 &&
    prevProps.alert.tp5 === nextProps.alert.tp5 &&
    prevProps.alert.notes === nextProps.alert.notes &&
    prevProps.alert.close_reason === nextProps.alert.close_reason &&
    prevProps.alert.tp_hits === nextProps.alert.tp_hits &&
    prevProps.isAdmin === nextProps.isAdmin &&
    prevProps.isCreator === nextProps.isCreator &&
    prevProps.isRecentClosure === nextProps.isRecentClosure &&
    prevProps.className === nextProps.className &&
    prevProps.testId === nextProps.testId &&
    JSON.stringify(prevProps.creator) === JSON.stringify(nextProps.creator)
    // Note: livePrice is intentionally excluded to prevent card re-renders on price updates
  );
});
