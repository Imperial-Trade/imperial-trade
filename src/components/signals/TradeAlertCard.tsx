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
    return () => window.removeEventListener('order-activation-confirmed', handleActivation as EventListener);
  }, [alert.id, alert.status, alert.assetName, onStatusUpdate]);

  useEffect(() => {
    console.log(`📝 Notes sync for alert ${alert.id}: "${alert.notes}" (previous: "${localNotes}")`);
    
    // Only update local state if not currently editing to avoid overwriting user input
    if (!isEditingNotes) {
      setLocalNotes(alert.notes || '');
      setNotesDraft(alert.notes || '');
      
      // Show brief sync confirmation when notes change from real-time updates
      if (alert.notes !== localNotes) {
        setNotesSyncStatus('saved');
        setTimeout(() => setNotesSyncStatus('idle'), 1500);
      }
    }
  }, [alert.id, alert.notes, isEditingNotes, localNotes]);
  
  // Type-safe derivations
  const takeProfits = [alert.tp1, alert.tp2, alert.tp3, alert.tp4, alert.tp5].filter((tp): tp is number => tp !== undefined);
  const hitTPs = alert.tpHits || [];
  const isClosed = alert.status === 'closed';
  const isPending = alert.status === 'pending';
  const canCloseSignal = isCreator;
  const canEditNotes = isCreator && (alert.status === 'active' || alert.status === 'pending');
  const { getPrice } = useOptimizedWebSocketPrices();

  // Stop-Loss Proximity state management (moved to top level to fix React Hooks violation)
  const [showStopLossProximity, setShowStopLossProximity] = useState(false);
  const lastToggleTimestampRef = useRef(0);

  // Convert alert to TradeSignal format for sharing
  const tradeSignal: TradeSignal = {
    id: alert.id,
    assetName: alert.assetName,
    tradeType: alert.tradeType,
    entryPrice: alert.entryPrice,
    stopLoss: alert.stopLoss,
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
      setNotesSyncStatus('saving');
      
      // Optimistic update - immediately show new notes locally
      setLocalNotes(notesDraft);
      setIsEditingNotes(false);
      
      console.log(`📝 Saving notes for alert ${alert.id}:`, notesDraft);
      
      const { error } = await supabase
        .from('trade_alerts')
        .update({ notes: notesDraft })
        .eq('id', alert.id);

      if (error) throw error;

      console.log(`✅ Notes saved successfully for alert ${alert.id}`);
      setNotesSyncStatus('saved');
      
      // Clear success status after 2 seconds
      setTimeout(() => setNotesSyncStatus('idle'), 2000);
      
      toast({ title: 'Notes updated', description: 'Everyone can now see the new notes.' });
    } catch (e: any) {
      console.error(`❌ Failed to save notes for alert ${alert.id}:`, e);
      // Revert optimistic update on error
      setLocalNotes(alert.notes || '');
      setIsEditingNotes(true);
      setNotesSyncStatus('error');
      
      // Clear error status after 3 seconds
      setTimeout(() => setNotesSyncStatus('idle'), 3000);
      
      toast({ variant: 'destructive', title: 'Failed to update notes', description: e?.message || 'Please try again.' });
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Stop-Loss Proximity effect (moved to top level to fix React Hooks violation)
  useEffect(() => {
    if (alert.status !== 'active' || !alert.entryPrice || !alert.stopLoss) {
      return;
    }

    const wsPrice = getPrice?.(alert.tradermadeSymbol?.trim().toUpperCase())?.price;
    const currentPrice = typeof livePrice === 'number' ? livePrice : (typeof wsPrice === 'number' ? wsPrice : null);
    
    if (!currentPrice) return;

    const totalDistance = Math.abs(alert.entryPrice - alert.stopLoss);
    if (totalDistance === 0) return;
    
    const currentDistance = Math.abs(currentPrice - alert.stopLoss);
    const proximityPercentage = ((totalDistance - currentDistance) / totalDistance) * 100;
    
    const now = Date.now();
    const throttleMs = 5000; // 5 second throttle

    // Hysteresis logic: Show at >= 55%, Hide at <= 45%
    if (!showStopLossProximity && proximityPercentage >= 55 && (now - lastToggleTimestampRef.current > throttleMs)) {
      setShowStopLossProximity(true);
      lastToggleTimestampRef.current = now;
    } else if (showStopLossProximity && proximityPercentage <= 45 && (now - lastToggleTimestampRef.current > throttleMs)) {
      setShowStopLossProximity(false);
      lastToggleTimestampRef.current = now;
    }
  }, [livePrice, alert, showStopLossProximity, getPrice]);

  // Get button text (only creator can close in stream)
  const getCloseButtonText = () => 'Close My Signal';

  return (
    <div 
      className={`bg-card rounded-lg border border-border shadow-lg overflow-hidden transition-shadow duration-300 hover:shadow-accent-green/10 ${isClosed ? 'opacity-50' : ''} ${isPending ? 'border-accent-gold/50 hover:border-accent-gold' : 'hover:border-accent-green/50'} ${isClosed && (alert.closeReason === 'stop_loss' ? 'ring-2 ring-accent-red/30' : hitTPs.length > 0 || alert.closeReason?.startsWith('tp') ? 'ring-2 ring-accent-green/30' : 'ring-2 ring-border/30')} ${justAdded ? 'ring-2 ring-accent-green/50 shadow-accent-green/20' : ''} ${className || ''}`}
      data-testid={testId}
    >
      {/* Glowing top indicator for closed trades */}
      {isClosed && (
        <div className={`h-1 w-full ${
          alert.closeReason === 'stop_loss' 
            ? 'bg-gradient-to-r from-accent-red/50 via-accent-red/70 to-accent-red/50 shadow-lg shadow-accent-red/30' 
            : (hitTPs.length > 0 || alert.closeReason?.startsWith('tp'))
              ? 'bg-gradient-to-r from-accent-green/50 via-accent-green/70 to-accent-green/50 shadow-lg shadow-accent-green/30'
              : 'bg-gradient-to-r from-muted-foreground/50 via-muted-foreground/70 to-muted-foreground/50 shadow-lg shadow-muted-foreground/30'
        }`} />
      )}

      <div className="p-3">
        {/* Use the new AnimatedStatusHeader component with primitive props */}
        <AnimatedStatusHeader 
          creator={creator} 
          assetName={alert.assetName}
          status={alert.status}
          tradeType={alert.tradeType}
          closeReason={alert.closeReason}
          highestTP={hitTPs.length ? Math.max(...hitTPs) : null}
          hasTPHits={Boolean(hitTPs.length)}
          isRecentClosure={isRecentClosure} 
          justAdded={justAdded}
          createdDate={alert.createdAt}
          updatedDate={alert.updatedAt}
        />

        {/* Actions - moved to the right */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end mb-2" data-prevent-widget-open="true">
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
          
          {/* Calculator Toggle - Only for active/pending/partially_profited trades */}
          {(alert.status === 'active' || alert.status === 'pending' || alert.status === 'partially_profited') && (
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

      <Collapsible open={showCopyPanel} onOpenChange={setShowCopyPanel}>
        <CollapsibleContent className="px-3 pb-3" data-prevent-widget-open="true">
            <QuickCopyPanel alert={alert} />
        </CollapsibleContent>
      </Collapsible>

      {/* Trading Calculator */}
      <Collapsible open={showCalculator} onOpenChange={setShowCalculator}>
        <CollapsibleContent className="px-3 pb-3">
            <TradingCalculator alert={alert} livePrice={livePrice} />
        </CollapsibleContent>
      </Collapsible>

      {/* Use the new PricePanel component with primitive props and tpHitsKey */}
      <PricePanel 
        id={alert.id}
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
        tpHitsKey={(alert.tpHits || []).join(',')}
        status={alert.status}
        closeReason={alert.closeReason}
        allowAutomation={isCreator}
        onTakeProfitHit={onTakeProfitHit}
        onStopLossHit={onStopLossHit}
        onOrderActivation={onOrderActivation}
      />
      
      
      <div className="px-3 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Notes</span>
            <NotesSyncIndicator status={notesSyncStatus} />
          </div>
          {canEditNotes && !isEditingNotes && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-accent-blue hover:bg-accent-blue/20 hover:text-accent-blue h-6 px-2" 
              onClick={handleNotesEditToggle}
            >
              <Pencil className="w-3 h-3 mr-1" /> Edit
            </Button>
          )}
        </div>
        {isEditingNotes ? (
          <div className="space-y-1.5">
            <Textarea 
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Add helpful context for followers..."
              className="min-h-[60px] text-sm"
            />
            <div className="flex justify-end gap-1.5">
              <Button variant="ghost" size="sm" onClick={handleNotesEditToggle} disabled={isSavingNotes} className="h-6 px-2 text-xs">Cancel</Button>
              <Button variant="default" size="sm" onClick={handleNotesSave} disabled={isSavingNotes || notesDraft === localNotes} className="h-6 px-2 text-xs">
                {isSavingNotes ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic bg-muted/50 p-1.5 rounded-md">{localNotes ? `"${localNotes}"` : '—'}</p>
        )}
      </div>

      {/* Stop Loss Proximity Warning (fixed React Hooks violation) */}
      {alert.status === 'active' && showStopLossProximity && (
        <div className="px-3 pb-3">
          <div className="bg-accent-gold/10 border border-accent-gold/30 rounded-md p-2 flex items-start gap-1.5 transition-opacity duration-300">
            <span className="text-accent-gold mt-0.5 leading-none text-sm">🟡</span>
            <div className="text-xs text-accent-gold">
              <span className="font-semibold">Stop-Loss Proximity Warning</span>
              <br />
              <span className="text-accent-gold/80">This trade is more than halfway to its invalidation point.</span>
            </div>
          </div>
        </div>
      )}
      
      {canCloseSignal && (alert.status === 'active' || alert.status === 'pending' || alert.status === 'partially_profited') && (
        <div className="bg-muted/50 px-3 py-1.5 flex justify-end">
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-accent-red hover:bg-accent-red/20 hover:text-accent-red h-7 px-2 text-xs" 
              onClick={() => handleStatusUpdate('closed')}
            >
                <Lock className="w-3 h-3 mr-1.5" />
                {isPending ? 'Cancel Order' : getCloseButtonText()}
            </Button>
        </div>
      )}
    </div>
  );
};

export default memo(TradeAlertCard, (prevProps, nextProps) => {
  // 🚀 COMPREHENSIVE memo comparison to prevent unnecessary re-renders while allowing smooth price updates
  const prevHitsKey = (prevProps.alert.tpHits || []).join(',');
  const nextHitsKey = (nextProps.alert.tpHits || []).join(',');
  
  return (
    prevProps.alert.id === nextProps.alert.id &&
    prevProps.alert.status === nextProps.alert.status &&
    prevProps.alert.assetName === nextProps.alert.assetName &&
    prevProps.alert.tradeType === nextProps.alert.tradeType &&
    prevProps.alert.entryPrice === nextProps.alert.entryPrice &&
    prevProps.alert.stopLoss === nextProps.alert.stopLoss &&
    prevProps.alert.tp1 === nextProps.alert.tp1 &&
    prevProps.alert.tp2 === nextProps.alert.tp2 &&
    prevProps.alert.tp3 === nextProps.alert.tp3 &&
    prevProps.alert.tp4 === nextProps.alert.tp4 &&
    prevProps.alert.tp5 === nextProps.alert.tp5 &&
    prevProps.alert.notes === nextProps.alert.notes &&
    prevProps.alert.closeReason === nextProps.alert.closeReason &&
    prevHitsKey === nextHitsKey &&
    prevProps.isAdmin === nextProps.isAdmin &&
    prevProps.isCreator === nextProps.isCreator &&
    prevProps.justAdded === nextProps.justAdded &&
    prevProps.className === nextProps.className &&
    JSON.stringify(prevProps.creator) === JSON.stringify(nextProps.creator)
    // 🚀 CRITICAL: livePrice is intentionally excluded to allow smooth 1-second price updates
  );
});