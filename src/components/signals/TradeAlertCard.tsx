import React, { useState, memo, useEffect, useRef, useMemo, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, Copy, ChevronDown, ChevronUp, Calculator, Share2, Pencil, Loader2, Crown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import QuickCopyPanel from './QuickCopyPanel';
import { QuickCopyPanelErrorBoundary } from './QuickCopyPanelErrorBoundary';
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
import { tradingApiService } from '@/api/services/TradingApiService';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { NotesSyncIndicator } from './NotesSyncIndicator';
import { useSignalRealtime } from '@/contexts/SignalRealtimeContext';
import { perfMonitor } from '@/utils/performanceMonitor';
import { useSignalTheme } from '@/hooks/useSignalTheme';


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
  justAdded = false,
  timestampRefreshKey
}) => {
  const { colors } = useSignalTheme();
  // ✅ PHASE 2: Performance monitoring for TradeAlertCard renders
  const perfStartRef = useRef<number>(performance.now());
  const [showCopyPanel, setShowCopyPanel] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(alert.notes || '');
  const [localNotes, setLocalNotes] = useState(alert.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSyncStatus, setNotesSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isClosing, setIsClosing] = useState(false);
  const [isPreparingToClose, setIsPreparingToClose] = useState(false); // Track if user clicked close and needs to enter reason
  
  // PHASE 7: Get signal retrieval function for instant UI updates
  const { getSignalById } = useSignalRealtime();
  
  // 🎯 BUG FIX #1 & #3: Pass full signal object to onStatusUpdate instead of just signalId
  useEffect(() => {
    const handleSignalUpdate = (event: CustomEvent) => {
      const { signalId, status } = event.detail;
      
      if (signalId !== alert.id) return;
      
      if (status === 'active' || status === 'closed') {
        console.log(`🎯 SIGNAL UPDATE EVENT: Signal ${alert.id} status changed to ${status} - forcing UI sync`);
        
        // Pull latest data from realtime context
        const latestSignal = getSignalById(signalId);
        if (latestSignal && onStatusUpdate) {
          console.log(`🔄 FORCING STATUS UPDATE: ${alert.status} → ${status} for ${alert.asset_name}`);
          // ✅ FIX: Pass full signal object instead of just signalId
          onStatusUpdate(latestSignal as any, latestSignal.status);
        }
      }
    };

    window.addEventListener('order-activation-confirmed', handleSignalUpdate as EventListener);
    window.addEventListener('signal-closed-confirmed', handleSignalUpdate as EventListener);
    
    return () => {
      window.removeEventListener('order-activation-confirmed', handleSignalUpdate as EventListener);
      window.removeEventListener('signal-closed-confirmed', handleSignalUpdate as EventListener);
    };
  }, [alert.id, alert.status, alert.asset_name, onStatusUpdate, getSignalById]);

  // 🎯 FIX #4B: Optimized notes sync using useRef to prevent unnecessary re-renders
  const notesSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    console.log(`📝 Notes sync for alert ${alert.id}: "${alert.notes}"`);
    
    // Only update local state if not currently editing to avoid overwriting user input
    if (!isEditingNotes && alert.notes !== localNotes) {
      setLocalNotes(alert.notes || '');
      setNotesDraft(alert.notes || '');
      
      // Show brief sync confirmation when notes change from real-time updates
      setNotesSyncStatus('saved');
      
      // Clear existing timeout
      if (notesSyncTimeoutRef.current) {
        clearTimeout(notesSyncTimeoutRef.current);
      }
      
      // Set new timeout
      notesSyncTimeoutRef.current = setTimeout(() => {
        setNotesSyncStatus('idle');
      }, 1500);
    }
  }, [alert.id, alert.notes, isEditingNotes]); // Removed localNotes from deps
  
  // ✅ PHASE 2: Performance monitoring cleanup on unmount
  useEffect(() => {
    return () => {
      if (perfStartRef.current) {
        perfMonitor.mark('alert-card-render', perfStartRef.current);
      }
    };
  }, []);
  
  // Type-safe derivations
  const takeProfits = [alert.tp1, alert.tp2, alert.tp3, alert.tp4, alert.tp5].filter((tp): tp is number => tp !== undefined);
  const hitTPs = alert.tp_hits || [];
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

  // ✅ Handle closing signal with closing reason
  const handleCloseWithReason = async (closingReason: string) => {
    if (!closingReason.trim()) {
      toast({
        title: '⚠️ Closing Reason Required',
        description: 'Please provide a reason for closing this signal',
        variant: 'destructive'
      });
      return;
    }

    console.log('🔒 [TradeAlertCard] Closing with reason:', {
      alertId: alert.id,
      closingReason: closingReason.substring(0, 50) + '...',
      timestamp: new Date().toISOString()
    });

    setIsClosing(true);
    setIsSavingNotes(true);
    try {
      // Get current user ID from creator
      if (!creator?.id) {
        throw new Error('User information not available');
      }

      // Call RPC with closing reason as notes
      const { data, error } = await supabase.rpc('close_trade_alert', {
        p_alert_id: alert.id,
        p_user_id: creator.id,
        p_close_reason: 'manual',
        p_notes: closingReason  // ✅ Pass closing reason as notes
      });

      if (error) {
        console.error('❌ RPC close_trade_alert failed:', error);
        throw new Error(error.message || 'Failed to close signal');
      }

      console.log('✅ Signal closed via RPC:', data);

      // ✅ INSTANT CLOSE FIX: Dispatch event IMMEDIATELY for optimistic UI update
      console.log('🚀 [INSTANT CLOSE] Dispatching close event immediately for instant UI');
      window.dispatchEvent(new CustomEvent('signal-closed-confirmed', {
        detail: {
          signalId: alert.id,
          assetName: alert.asset_name,
          closeReason: 'manual',
          notes: closingReason,
          timestamp: new Date().toISOString(),
          status: 'closed'  // ✅ Include final status
        }
      }));

      // ✅ Reset state immediately for instant UI feedback
      setIsPreparingToClose(false);
      setIsEditingNotes(false);
      setNotesDraft('');

      // ✅ Show success toast immediately
      toast({
        title: '✅ Signal Closed',
        description: `${alert.asset_name} has been closed successfully`
      });

      // ✅ Background: Trigger context refresh (DON'T await - let it happen in background)
      // This ensures the signal list updates, but doesn't block the UI
      if (onStatusUpdate) {
        // Fire and forget - UI is already updated optimistically
        onStatusUpdate(alert, 'closed').catch(error => {
          console.error('⚠️ Background refresh failed (non-critical):', error);
          // Non-critical error - signal is already closed in DB, just UI refresh failed
        });
      }
    } catch (error: any) {
      console.error('💥 [TradeAlertCard] Close with reason failed:', error);
      toast({
        title: '❌ Failed to Close',
        description: error.message || 'Please try again',
        variant: 'destructive'
      });
      // Don't reset state on error so user can retry
    } finally {
      setIsClosing(false);
      setIsSavingNotes(false);
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

  // ✅ NEW: Handle entering "close mode" - user clicks close button
  const handleEnterCloseMode = () => {
    console.log('🔒 [TradeAlertCard] Entering close mode:', {
      alertId: alert.id,
      isPending,
      timestamp: new Date().toISOString()
    });
    
    setIsPreparingToClose(true);
    setIsEditingNotes(true); // Open notes editor
    setNotesDraft(''); // Clear any existing notes for closing reason
  };

  // ✅ NEW: Handle canceling close mode
  const handleCancelClose = () => {
    setIsPreparingToClose(false);
    setIsEditingNotes(false);
    setNotesDraft(localNotes || ''); // Restore original notes
  };

  const handleNotesSave = async () => {
    // ✅ If in closing mode, close the signal instead of just saving notes
    if (isPreparingToClose) {
      await handleCloseWithReason(notesDraft.trim());
      return;
    }

    try {
      setIsSavingNotes(true);
      setNotesSyncStatus('saving');
      
      const originalNotes = alert.notes || '';
      const newNotes = notesDraft.trim();
      
      // Detect meaningful changes (minimum 10 characters difference or substantial content change)
      const lengthDiff = Math.abs(newNotes.length - originalNotes.length);
      const isMeaningfulChange = lengthDiff >= 10 || (newNotes.length > 20 && newNotes !== originalNotes);
      
      // Optimistic update - immediately show new notes locally
      setLocalNotes(notesDraft);
      setIsEditingNotes(false);
      
      console.log(`📝 Saving notes for alert ${alert.id}:`, notesDraft);
      
      // Guard: Ensure we have creator info for authorization
      if (!creator?.id) {
        throw new Error('Unable to save notes: user information not available');
      }
      
      // Use API service to properly filter data and avoid boolean field issues
      const result = await tradingApiService.updateAlert(
        alert.id,
        { notes: notesDraft },
        creator.id
      );

      if (!result.success) throw new Error(result.error || 'Failed to save notes');

      console.log(`✅ Notes saved successfully for alert ${alert.id}`);
      setNotesSyncStatus('saved');
      
      // Trigger notifications for meaningful notes updates
      if (isMeaningfulChange && alert.status === 'active' && creator?.id) {
        console.log(`🔔 Triggering notifications for meaningful notes update on signal ${alert.id}`);
        
        try {
          // Call notification dispatcher
          const { error: notifyError } = await supabase.functions.invoke('enhanced-signal-notification-dispatcher', {
            body: {
              notifications: [{
                signal_id: alert.id,
                user_id: creator.id,
                asset_name: alert.asset_name,
                trade_type: alert.trade_type,
                entry_price: alert.entry_price,
                stop_loss: alert.stop_loss,
                tp1: alert.tp1,
                tp2: alert.tp2,
                tp3: alert.tp3,
                tp4: alert.tp4,
                tp5: alert.tp5,
                symbol: alert.tradermade_symbol,
                tradermade_symbol: alert.tradermade_symbol,
                created_at: alert.created_date,
                updated_at: new Date().toISOString(),
                notification_type: 'notes_updated',
                alert_type: 'notes_updated',
                status: alert.status,
                notes: newNotes,
                change_types: ['notes_updated'],
                priority_level: 1,
                author_id: creator.id,
                author_name: creator.display_name || 'Unknown',
                author_avatar_url: creator.avatar_url,
                delivery_channels: ['push', 'in_app'],
                include_creator: false
              }]
            }
          });

          if (notifyError) {
            console.error('⚠️ Failed to send notes update notification:', notifyError);
          } else {
            console.log('✅ Notes update notification sent successfully');
          }
        } catch (notifyErr) {
          console.error('⚠️ Notes notification dispatch error:', notifyErr);
          // Don't fail the notes save if notification fails
        }
      }
      
      // Clear success status after 2 seconds
      setTimeout(() => setNotesSyncStatus('idle'), 2000);
      
      toast({ title: 'Notes updated', description: isMeaningfulChange ? 'Users have been notified of the new notes.' : 'Everyone can now see the new notes.' });
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

  // 🎯 FIX #4C: Optimized stop-loss proximity calculation with useMemo
  const proximityData = useMemo(() => {
    if (alert.status !== 'active' || !alert.entry_price || !alert.stop_loss) {
      return null;
    }

    const wsPrice = getPrice?.(alert.tradermade_symbol?.trim().toUpperCase())?.price;
    const currentPrice = typeof livePrice === 'number' ? livePrice : (typeof wsPrice === 'number' ? wsPrice : null);
    
    if (!currentPrice) return null;

    const totalDistance = Math.abs(alert.entry_price - alert.stop_loss);
    if (totalDistance === 0) return null;
    
    const currentDistance = Math.abs(currentPrice - alert.stop_loss);
    const proximityPercentage = ((totalDistance - currentDistance) / totalDistance) * 100;
    
    return { proximityPercentage };
  }, [alert.status, alert.entry_price, alert.stop_loss, livePrice, getPrice, alert.tradermade_symbol]);

  // Stop-Loss Proximity effect with throttle
  useEffect(() => {
    if (!proximityData) return;
    
    const { proximityPercentage } = proximityData;
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
  }, [proximityData, showStopLossProximity]);

  // Get button text (only creator can close in stream)
  const getCloseButtonText = () => 'Close My Signal';

  // Determine contextual styling based on close reason
  const getCardBackgroundStyle = () => {
    // All cards: Consistent dark glass background (always dark, regardless of theme)
    return {
      background: 'rgba(18, 18, 20, 0.95)',
      backdropFilter: 'blur(20px) saturate(120%)',
      WebkitBackdropFilter: 'blur(20px) saturate(120%)',
    };
  };


  return (
    <div 
      className={`rounded-2xl border overflow-hidden transition-all duration-300 ${className || ''}`}
      style={{
        ...getCardBackgroundStyle(),
        borderColor: isClosed 
          ? (alert.close_reason === 'stop_loss' 
              ? 'rgba(255, 69, 58, 0.5)' 
              : (alert.close_reason === 'all_tps_hit' || alert.close_reason?.startsWith('tp') || hitTPs.length > 0)
                ? 'rgba(0, 200, 5, 0.5)'
                : 'rgba(160, 160, 160, 0.45)')
          : colors.border.default,
        borderWidth: '1px',
        position: 'relative',
      }}
      data-testid={testId}
    >

      {/* Prominent top color band for closed alerts */}
      {isClosed && (
        <div 
          className="h-1.5 w-full relative z-10"
          style={{
            background: alert.close_reason === 'stop_loss'
              ? 'linear-gradient(180deg, rgba(80, 0, 0, 0.95) 0%, rgba(50, 0, 0, 0.80) 100%)'
              : (alert.close_reason === 'all_tps_hit' || alert.close_reason?.startsWith('tp') || hitTPs.length > 0)
              ? 'linear-gradient(180deg, rgba(0, 50, 0, 0.95) 0%, rgba(0, 35, 0, 0.80) 100%)'
              : 'linear-gradient(180deg, rgba(40, 40, 40, 0.95) 0%, rgba(25, 25, 25, 0.80) 100%)',
          }}
        />
      )}

      <div className="p-5 relative z-10">
        {/* Signal Header with Creator, Asset, Status */}
        <AnimatedStatusHeader
          creator={creator}
          assetName={alert.asset_name}
          status={alert.status}
          tradeType={alert.trade_type}
          closeReason={alert.close_reason}
          highestTP={hitTPs.length > 0 ? Math.max(...hitTPs) : null}
          hasTPHits={hitTPs.length > 0}
          isRecentClosure={isRecentClosure}
          justAdded={justAdded}
          createdDate={alert.created_date}
          updatedDate={alert.updated_date}
          timestampRefreshKey={timestampRefreshKey}
          actionIcons={
            <>
              <button
                onClick={handleCopyPanelToggle}
                className="h-7 w-7 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
                style={{
                  background: showCopyPanel ? colors.state.active : colors.bg.surface,
                  border: `1px solid ${colors.border.default}`,
                  color: showCopyPanel ? colors.text.accent : colors.text.secondary,
                }}
                aria-label="Copy signal"
                data-prevent-widget-open="true"
              >
                <Copy className="w-3 h-3" />
              </button>
              
              <SignalSharingModal 
                signal={tradeSignal}
                trigger={
                  <button
                    className="h-7 w-7 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
                    style={{
                      background: colors.bg.surface,
                      border: `1px solid ${colors.border.default}`,
                      color: colors.text.secondary,
                    }}
                    aria-label="Share signal"
                  >
                    <Share2 className="w-3 h-3" />
                  </button>
                }
              />
              
              {(alert.status === 'active' || alert.status === 'pending') && (
                <button
                  onClick={handleCalculatorToggle}
                  className="h-7 w-7 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
                  style={{
                    background: showCalculator ? colors.semantic.success : colors.bg.surface,
                    border: `1px solid ${colors.border.default}`,
                    color: showCalculator ? colors.text.success : colors.text.secondary,
                  }}
                  aria-label="Calculator"
                >
                  <Calculator className="w-3 h-3" />
                </button>
              )}
            </>
          }
        />
      </div>

      <Collapsible open={showCopyPanel} onOpenChange={setShowCopyPanel}>
        <CollapsibleContent className="px-3 pb-3" data-prevent-widget-open="true">
          <QuickCopyPanelErrorBoundary>
            <QuickCopyPanel alert={alert} />
          </QuickCopyPanelErrorBoundary>
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
        assetName={alert.asset_name}
        symbol={alert.tradermade_symbol}
        tradeType={alert.trade_type}
        entryPrice={alert.entry_price}
        stopLoss={alert.stop_loss}
        tp1={alert.tp1}
        tp2={alert.tp2}
        tp3={alert.tp3}
        tp4={alert.tp4}
        tp5={alert.tp5}
        tpHitsKey={(alert.tp_hits || []).join(',')}
        status={alert.status}
        closeReason={alert.close_reason}
        allowAutomation={isCreator}
        onTakeProfitHit={onTakeProfitHit}
        onStopLossHit={onStopLossHit}
        onOrderActivation={onOrderActivation}
      />
      
      
      <div className="px-3 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              {isPreparingToClose ? 'Closing Reason' : 'Notes'}
            </span>
            <NotesSyncIndicator status={notesSyncStatus} />
          </div>
          {canEditNotes && !isEditingNotes && !isPreparingToClose && (
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
              placeholder={isPreparingToClose 
                ? (isPending 
                  ? "Explain why you're cancelling this order..." 
                  : "Explain why you're closing this signal...")
                : "Add helpful context for followers..."}
              className="min-h-[60px] text-sm"
              autoFocus={isPreparingToClose}
            />
            <div className="flex justify-end gap-1.5">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={isPreparingToClose ? handleCancelClose : handleNotesEditToggle} 
                disabled={isSavingNotes} 
                className="h-6 px-2 text-xs"
              >
                Cancel
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleNotesSave} 
                disabled={isSavingNotes || (!isPreparingToClose && notesDraft === localNotes) || (isPreparingToClose && !notesDraft.trim())} 
                className="h-6 px-2 text-xs"
              >
                {isSavingNotes ? (isPreparingToClose ? 'Closing...' : 'Saving...') : (isPreparingToClose ? 'Close Alert' : 'Save')}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-foreground italic bg-muted/50 p-1.5 rounded-md">{localNotes ? `"${localNotes}"` : '—'}</p>
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
      
      {canCloseSignal && (alert.status === 'active' || alert.status === 'pending' || alert.status === 'partially_profited') && !isPreparingToClose && (
        <div className="bg-muted/50 px-3 py-1.5 flex justify-end">
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-accent-red hover:bg-accent-red/20 hover:text-accent-red h-7 px-2 text-xs" 
              onClick={handleEnterCloseMode}
              disabled={isClosing || isEditingNotes}
            >
              <Lock className="w-3 h-3 mr-1.5" />
              {isPending ? 'Cancel Order' : 'Close My Signal'}
            </Button>
        </div>
      )}
    </div>
  );
};

// 🎯 FIX #4D: Optimized memo comparison with early exit and cached TP hits
export default memo(TradeAlertCard, (prevProps, nextProps) => {
  // Quick reference check first (most common case - prevents expensive comparisons)
  if (prevProps.alert === nextProps.alert && 
      prevProps.creator === nextProps.creator) {
    return true;
  }
  
  // Check primitives first (fast operations)
  const primitivesMatch = (
    prevProps.alert.id === nextProps.alert.id &&
    prevProps.alert.status === nextProps.alert.status &&
    prevProps.alert.entry_price === nextProps.alert.entry_price &&
    prevProps.alert.stop_loss === nextProps.alert.stop_loss &&
    prevProps.alert.notes === nextProps.alert.notes &&
    prevProps.alert.close_reason === nextProps.alert.close_reason &&
    prevProps.isAdmin === nextProps.isAdmin &&
    prevProps.isCreator === nextProps.isCreator &&
    prevProps.justAdded === nextProps.justAdded &&
    prevProps.className === nextProps.className
  );
  
  if (!primitivesMatch) return false;
  
  // Check TPs (already primitives, fast)
  const tpsMatch = (
    prevProps.alert.tp1 === nextProps.alert.tp1 &&
    prevProps.alert.tp2 === nextProps.alert.tp2 &&
    prevProps.alert.tp3 === nextProps.alert.tp3 &&
    prevProps.alert.tp4 === nextProps.alert.tp4 &&
    prevProps.alert.tp5 === nextProps.alert.tp5
  );
  
  if (!tpsMatch) return false;
  
  // Only do expensive array/object comparison if primitives match
  const prevHitsLength = prevProps.alert.tp_hits?.length || 0;
  const nextHitsLength = nextProps.alert.tp_hits?.length || 0;
  
  const tpHitsMatch = (
    prevHitsLength === nextHitsLength &&
    (prevHitsLength === 0 || (prevProps.alert.tp_hits?.join(',') === nextProps.alert.tp_hits?.join(',')))
  );
  
  if (!tpHitsMatch) return false;
  
  // Creator comparison (last, most expensive)
  const creatorMatch = JSON.stringify(prevProps.creator) === JSON.stringify(nextProps.creator);
  
  if (!creatorMatch) return false;

  return prevProps.timestampRefreshKey === nextProps.timestampRefreshKey;
  // 🚀 CRITICAL: livePrice is intentionally excluded to allow smooth 1-second price updates
});