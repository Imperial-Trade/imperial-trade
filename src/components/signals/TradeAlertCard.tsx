import React, { useState, memo, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, Copy, ChevronDown, ChevronUp, Calculator, Share2, Pencil } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import QuickCopyPanel from './QuickCopyPanel';
import LivePriceWidget from './LivePriceWidget';
import { LivePriceWidgetPriority } from '@/components/ui/LivePriceWidgetPriority';
import AnimatedStatusHeader from './AnimatedStatusHeader';
import PricePanel from './PricePanel';
import TradingCalculator from './TradingCalculator';
import SignalSharingModal from './SignalSharingModal';
import { TradeAlertCardProps } from '@/types/components';
import { TradeSignal } from '@/services/SignalSharingService';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { NotesSyncIndicator } from './NotesSyncIndicator';
import { TradeAlertWithProfile, createLegacyAlert } from '@/utils/dataTransformers';


const TradeAlertCard: React.FC<TradeAlertCardProps & { creator?: { id: string; display_name: string; role: string; avatar_url?: string }; justAdded?: boolean }> = ({ 
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
  creator,
  justAdded = false
}) => {
  const [showCopyPanel, setShowCopyPanel] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(alert.notes || '');
  const [localNotes, setLocalNotes] = useState(alert.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSyncStatus, setNotesSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // 🚀 PHASE 2: Enhanced activation listener for instant UI updates
  useEffect(() => {
    const handleActivation = (event: CustomEvent) => {
      const { signalId, status } = event.detail;
      if (signalId === alert.id && status === 'active') {
        console.log(`🎯 ACTIVATION EVENT: Signal ${alert.id} activated - forcing local update`);
        // Force immediate local state refresh
        if (onStatusUpdate && alert.status !== 'active') {
          console.log(`🔄 FORCING STATUS UPDATE: ${alert.status} → active for ${alert.assetName}`);
        }
      }
    };

    window.addEventListener('order-activation-confirmed', handleActivation as EventListener);
    return () => {
      window.removeEventListener('order-activation-confirmed', handleActivation as EventListener);
    };
  }, [alert.id, alert.status, alert.assetName, onStatusUpdate]);

  // Sync notes with props when changed externally
  useEffect(() => {
    if (!isEditingNotes) {
      setLocalNotes(alert.notes || '');
      setNotesDraft(alert.notes || '');
    }
  }, [alert.notes, isEditingNotes]);

  // Stop loss proximity warnings
  const [showStopLossWarning, setShowStopLossWarning] = useState(false);
  const [stopLossProximityWarning, setStopLossProximityWarning] = useState('');

  // 🚀 ACL-TRANSFORMED DATA: All properties now use camelCase
  // Derived state
  const takeProfits = [alert.tp1, alert.tp2, alert.tp3, alert.tp4, alert.tp5].filter(tp => tp != null) as number[];
  const hitTPs = alert.tpHits || [];
  const isClosed = alert.status === 'closed';
  const isPending = alert.status === 'pending';
  
  // Enhanced trade signal for sharing
  const tradeSignal: TradeSignal = {
    asset: alert.assetName,
    type: alert.tradeType,
    entry: alert.entryPrice,
    stopLoss: alert.stopLoss,
    tp1: alert.tp1,
    tp2: alert.tp2,
    tp3: alert.tp3,
    tp4: alert.tp4,
    tp5: alert.tp5,
    takeProfits,
    hitTPs,
    status: alert.status,
    notes: alert.notes
  };

  // 🚀 PHASE 2: Live price monitoring with stop loss proximity detection
  useEffect(() => {
    if (!livePrice || !alert.entryPrice || !alert.stopLoss || isClosed) {
      setShowStopLossWarning(false);
      return;
    }

    // Calculate proximity thresholds
    const stopLossDistance = Math.abs(livePrice - alert.entryPrice);
    const allowableDistance = alert.entryPrice * 0.02; // 2% threshold
    
    if (stopLossDistance <= allowableDistance) {
      setStopLossProximityWarning(`Price is ${((stopLossDistance / alert.entryPrice) * 100).toFixed(2)}% away from stop loss`);
      setShowStopLossWarning(true);

      // Symbol for price subscription
      const symbol = alert.tradermadeSymbol;
      
      // Subscribe to live price updates
      subscribeToLivePrices([symbol]);
    } else {
      const entryStopDistance = Math.abs(alert.entryPrice - alert.stopLoss);
      const currentStopDistance = Math.abs(livePrice - alert.stopLoss);
      
      if (currentStopDistance < entryStopDistance * 0.1) { // 10% of original distance
        setStopLossProximityWarning(`Price approaching stop loss at ${alert.stopLoss}`);
        setShowStopLossWarning(true);
      } else {
        setShowStopLossWarning(false);
      }
    }
  }, [livePrice, alert.entryPrice, alert.stopLoss, isClosed, alert.tradermadeSymbol]);

  // Price subscription from WebSocket context
  const { subscribeToLivePrices } = useOptimizedWebSocketPrices();

  // Event handlers
  const handleCopyPanelToggle = () => setShowCopyPanel(!showCopyPanel);
  const handleCalculatorToggle = () => setShowCalculator(!showCalculator);

  const handleSaveNotes = async () => {
    if (isSavingNotes || notesDraft === localNotes) return;

    setIsSavingNotes(true);
    setNotesSyncStatus('saving');

    try {
      const { error } = await supabase
        .from('trade_alerts')
        .update({ notes: notesDraft })
        .eq('id', alert.id);

      if (error) {
        console.error('Error updating notes:', error);
        setNotesSyncStatus('error');
        toast({
          title: 'Failed to save notes',
          description: 'Please try again',
          variant: 'destructive',
        });
        return;
      }

      setLocalNotes(notesDraft);
      setIsEditingNotes(false);
      setNotesSyncStatus('saved');

      // Reset sync status after a delay
      setTimeout(() => setNotesSyncStatus('idle'), 2000);

      toast({
        title: 'Notes saved successfully',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error saving notes:', error);
      setNotesSyncStatus('error');
      toast({
        title: 'Failed to save notes',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSavingNotes(false);
    }
  };

  return (
    <div 
      className={`
        trade-alert-card group/card relative bg-gradient-to-r from-background/50 to-background/30 
        backdrop-blur-sm border rounded-lg p-4 space-y-4 transition-all duration-300 hover:shadow-lg
        ${isClosed ? 'border-muted/50' : 'border-muted'}
        ${alert.closeReason === 'stop_loss' ? 'border-destructive/20 bg-gradient-to-r from-destructive/5 to-destructive/10' : ''}
        ${alert.closeReason === 'manual' ? 'border-warning/20 bg-gradient-to-r from-warning/5 to-warning/10' : ''}
        ${className || ''}
      `}
      data-testid={testId}
    >
      <div className="flex items-center justify-between">
        {/* Status Badge */}
        {alert.closeReason && (
          <Badge 
            variant={alert.closeReason === 'stop_loss' ? 'destructive' : 'secondary'}
            className="text-xs font-medium"
          >
            Closed: {alert.closeReason.replace('_', ' ')}
          </Badge>
        )}
      </div>

      {/* Trade Alert Content */}
      <AnimatedStatusHeader 
        assetName={alert.assetName} 
        status={alert.status} 
        tradeType={alert.tradeType} 
        closeReason={alert.closeReason}
        createdDate={alert.createdAt}
        updatedDate={alert.updatedAt}
        hasTPHits={hitTPs.length > 0}
        creator={creator}
      />

      {/* Stop Loss Proximity Warning */}
      {showStopLossWarning && (
        <div className="bg-warning/10 border border-warning/20 rounded-md p-2">
          <p className="text-sm text-warning-foreground font-medium">
            ⚠️ {stopLossProximityWarning}
          </p>
        </div>
      )}

      {/* Live Price Widget */}
      <div className="flex items-center gap-3">
        <LivePriceWidgetPriority 
          symbol={alert.tradermadeSymbol} 
          className="flex-1" 
          compact={true}
        />
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyPanelToggle}
            className="h-8 px-3 gap-1.5"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleCalculatorToggle}
            className="h-8 px-3 gap-1.5"
          >
            <Calculator className="h-3.5 w-3.5" />
            Calc
          </Button>
        </div>
      </div>

      <Collapsible open={showCopyPanel} onOpenChange={setShowCopyPanel}>
        <CollapsibleContent>
          <QuickCopyPanel signal={tradeSignal} />
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={showCalculator} onOpenChange={setShowCalculator}>
        <CollapsibleContent>
          <TradingCalculator 
            alert={createLegacyAlert(alert)}
            livePrice={livePrice} 
            hitTPs={hitTPs}
            takeProfits={takeProfits}
            assetName={alert.assetName}
            symbol={alert.tradermadeSymbol}
            tradeType={alert.tradeType}
            entryPrice={alert.entryPrice}
            stopLoss={alert.stopLoss}
            tp1={alert.tp1}
            tp2={alert.tp2}
            tp3={alert.tp3}
            tp4={alert.tp4}
            tp5={alert.tp5}
            tpHits={alert.tpHits}
            status={alert.status}
            closeReason={alert.closeReason}
            notes={alert.notes}
          />
        </CollapsibleContent>
      </Collapsible>

      <PricePanel 
        alert={alert}
        livePrice={livePrice} 
        hitTPs={hitTPs}
        takeProfits={takeProfits}
        onStatusUpdate={onStatusUpdate}
        onStopLossHit={onStopLossHit}
        onTakeProfitHit={(alert, newTPHits, shouldAutoClose, closeReason) => onTakeProfitHit(alert, newTPHits, shouldAutoClose, closeReason)}
        onActivateOrder={onActivateOrder}
        isAdmin={isAdmin}
        isCreator={isCreator}
      />

      {/* Notes Section */}
      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Notes
            <NotesSyncIndicator status={notesSyncStatus} />
          </h4>
          {isEditingNotes && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNotesDraft(localNotes);
                  setIsEditingNotes(false);
                }}
                className="h-7 px-2 text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSaveNotes}
                disabled={isSavingNotes || notesDraft === localNotes}
                className="h-7 px-2 text-xs"
              >
                {isSavingNotes ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>
        
        {isEditingNotes ? (
          <Textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Add your trading notes..."
            className="min-h-[80px] resize-none"
          />
        ) : (
          <div 
            className="min-h-[80px] p-3 bg-muted/30 rounded-md cursor-text text-sm leading-relaxed"
            onClick={() => setIsEditingNotes(true)}
          >
            {localNotes || (
              <span className="text-muted-foreground italic">
                Click to add trading notes...
              </span>
            )}
          </div>
        )}
      </div>

      {/* Close Signal Button - Only show for creators on active signals */}
      {isCreator && alert.status === 'active' && (
        <div className="flex justify-end pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onStatusUpdate(alert, 'closed')}
            className="text-xs"
          >
            Close My Signal
          </Button>
        </div>
      )}

      {/* Signal Sharing Modal */}
      <SignalSharingModal signal={tradeSignal} />
    </div>
  );
};

// Performance-optimized memo with custom comparison
export default memo(TradeAlertCard, (prevProps, nextProps) => {
  try {
    // Check if all properties are the same except tpHits (they should be synced)
    const propsAreEqual = 
      prevProps.alert.tpHits?.length === nextProps.alert.tpHits?.length &&
      prevProps.alert.tpHits?.every((hit, index) => hit === nextProps.alert.tpHits?.[index]) &&
      Object.keys(prevProps.alert).every(key => {
        if (key === 'assetName') return prevProps.alert.assetName === nextProps.alert.assetName;
        if (key === 'tradeType') return prevProps.alert.tradeType === nextProps.alert.tradeType;
        if (key === 'entryPrice') return prevProps.alert.entryPrice === nextProps.alert.entryPrice;
        if (key === 'stopLoss') return prevProps.alert.stopLoss === nextProps.alert.stopLoss;
        if (key === 'tp1') return prevProps.alert.tp1 === nextProps.alert.tp1;
        if (key === 'tp2') return prevProps.alert.tp2 === nextProps.alert.tp2;
        if (key === 'tp3') return prevProps.alert.tp3 === nextProps.alert.tp3;
        if (key === 'tp4') return prevProps.alert.tp4 === nextProps.alert.tp4;
        if (key === 'tp5') return prevProps.alert.tp5 === nextProps.alert.tp5;
        if (key === 'closeReason') return prevProps.alert.closeReason === nextProps.alert.closeReason;
        return true;
      });

    // 🚀 CRITICAL: Allow livePrice updates to pass through for real-time updates
    const liveOrConnectionUpdates = 
      prevProps.livePrice !== nextProps.livePrice ||
      prevProps.connectionStatus !== nextProps.connectionStatus ||
      prevProps.isRecentClosure !== nextProps.isRecentClosure;

    // Only re-render if props changed OR we need live updates
    return propsAreEqual && !liveOrConnectionUpdates;

  } catch (error) {
    console.error('TradeAlertCard memo comparison error:', error);
    return false; // Re-render on error for safety
  }
});