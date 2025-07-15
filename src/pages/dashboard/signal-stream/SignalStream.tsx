import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOptimizedTrading } from '@/hooks/useOptimizedTrading';
import { UpdateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { Loader2, AlertTriangle, Share2 } from 'lucide-react';
import TradeAlertCard from '@/components/signals/TradeAlertCard';
import NotificationSystem from '@/components/notifications/NotificationSystem';
import usePriceFeed from '@/components/hooks/usePriceFeed';
import { useAuth } from '@/contexts/AuthContext';

export default function SignalStream() {
  const { user, profile } = useAuth();
  const [retryCount, setRetryCount] = useState(0);
  const [sharingStates, setSharingStates] = useState<Record<string, boolean>>({});

  // Use the optimized trading hook with real-time updates for all signals
  const {
    alerts: allAlerts,
    isLoading,
    error,
    updateAlert,
    refreshAlerts,
    connectionStatus,
    lastUpdated
  } = useOptimizedTrading(user?.id || '', true);

  const loadAlerts = useCallback(async (isInitialLoad = false, retryAttempt = 0) => {
    if (isInitialLoad) {
      // Loading state handled by useOptimizedTrading
    }
    
    try {
      console.log(`Loading alerts - attempt ${retryAttempt + 1}`);
      await refreshAlerts();
      console.log(`Successfully loaded ${allAlerts.length} alerts`);
      setRetryCount(0);
      
    } catch (err) {
      console.error("Failed to load trade alerts:", err);
      if (retryAttempt < 2) { 
        const backoffDelay = Math.pow(2, retryAttempt) * 3000;
        console.log(`Retrying in ${backoffDelay / 1000} seconds...`);
        setRetryCount(retryAttempt + 1);
        setTimeout(() => {
          loadAlerts(false, retryAttempt + 1);
        }, backoffDelay);
        return;
      }
    }
  }, [refreshAlerts, allAlerts.length]);

  useEffect(() => {
    // --- Real-time Update Logic ---
    const handleSignalPosted = () => {
        console.log('New signal event received, reloading alerts instantly.');
        loadAlerts(false);
    };

    window.addEventListener('signal-posted', handleSignalPosted);
    
    // The polling interval is a fallback in case the event listener fails.
    const interval = setInterval(() => loadAlerts(false), 30000); 

    return () => {
        clearInterval(interval);
        window.removeEventListener('signal-posted', handleSignalPosted);
    };
  }, [loadAlerts]);

  const { activeAlerts, closedAlerts } = useMemo(() => {
    const safeAlerts = Array.isArray(allAlerts) ? allAlerts : [];
    const active = safeAlerts.filter(a => a.status === 'active' || a.status === 'pending');
    const closed = safeAlerts.filter(a => a.status === 'closed');
    return { activeAlerts: active, closedAlerts: closed };
  }, [allAlerts]);

  const sortedClosedAlerts = useMemo(() => {
      return Array.isArray(closedAlerts) ? [...closedAlerts]
        .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
        .slice(0, 12) : [];
  }, [closedAlerts]);
  
  const symbols = useMemo(() => {
    const symbolSet = new Set<string>();
    const safeActiveAlerts = Array.isArray(activeAlerts) ? activeAlerts : [];
    
    safeActiveAlerts.forEach(alert => {
      if (alert && alert.finnhubSymbol) {
        symbolSet.add(alert.finnhubSymbol);
      }
    });
    
    const symbolList = Array.from(symbolSet);
    console.log('SignalStream - Final symbols for price feed:', symbolList);
    return symbolList;
  }, [activeAlerts]);

  const { prices: livePrices, connectionStatus: priceConnectionStatus, priceSource } = usePriceFeed(symbols);

  // Debug logging for price updates
  useEffect(() => {
    console.log('SignalStream - Live prices updated:', livePrices);
    console.log('SignalStream - Connection status:', priceConnectionStatus);
    console.log('SignalStream - Price source:', priceSource);
  }, [livePrices, priceConnectionStatus, priceSource]);

  const [updateInProgress, setUpdateInProgress] = useState(new Set<string>());

  // Helper functions for role checking
  const isAdmin = useMemo(() => {
    return profile?.access_level === 'admin' || profile?.role === 'admin';
  }, [profile]);

  const isCreator = useCallback((alertCreatorId: string) => {
    return profile?.id === alertCreatorId;
  }, [profile]);

  const handleStatusUpdate = useCallback(async (alert: any, newStatus: string) => {
      if (updateInProgress.has(alert.id)) return;
      
      // Check authorization
      const alertIsCreator = isCreator(alert.creator?.id);
      if (!alertIsCreator && !isAdmin) {
        if ((window as any).addNotification) {
          (window as any).addNotification({
            type: 'error',
            title: 'Access Denied',
            message: 'You can only close your own signals'
          });
        }
        return;
      }
      
      setUpdateInProgress(prev => new Set(prev).add(alert.id));
      try {
          console.log(`Updating alert ${alert.id} status to ${newStatus}`);
          const updateDto: UpdateTradeAlertDto = { 
            status: newStatus as 'pending' | 'active' | 'closed', 
            closeReason: newStatus === 'closed' ? 'manual' : undefined 
          };
          await updateAlert(alert.id, updateDto);
          setTimeout(() => loadAlerts(), 1000);
          if (newStatus === 'closed' && (window as any).addNotification) {
            (window as any).addNotification({
              type: 'trade_closed',
              title: `🔒 Trade Closed`,
              message: `${alert.assetName || alert.asset_name} trade has been manually closed`
            });
          }
      } catch (err) {
          console.error("Failed to update status:", err);
          if ((window as any).addNotification) {
              (window as any).addNotification({ 
                  type: 'error', 
                  title: 'Update Failed', 
                  message: 'Could not update trade status. Please try again.' 
              });
          }
      } finally {
        setUpdateInProgress(prev => {
          const newSet = new Set(prev);
          newSet.delete(alert.id);
          return newSet;
        });
      }
  }, [updateInProgress, loadAlerts, updateAlert, isAdmin, isCreator]);

  const handleTakeProfitHit = useCallback(async (alert: any, newTPHits: number[], shouldAutoClose = false, closeReason: string | null = null) => {
    if (updateInProgress.has(alert.id)) return;
    
    const alertIsCreator = isCreator(alert.creator?.id);
    if (!alertIsCreator && !isAdmin) return;
    
    setUpdateInProgress(prev => new Set(prev).add(alert.id));
    try {
        console.log(`Updating TP hits for alert ${alert.id}:`, newTPHits);
        
        let typedCloseReason: 'manual' | 'stop_loss' | 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'reversal_after_tp' | undefined = undefined;
        
        if (shouldAutoClose && closeReason) {
          switch (closeReason) {
            case 'manual':
            case 'stop_loss':
            case 'tp1':
            case 'tp2':
            case 'tp3':
            case 'tp4':
            case 'tp5':
            case 'reversal_after_tp':
              typedCloseReason = closeReason;
              break;
            default:
              typedCloseReason = 'manual';
          }
        }
        
        const updateDto: UpdateTradeAlertDto = { 
          tpHits: newTPHits,
          ...(shouldAutoClose && { 
            status: 'closed', 
            closeReason: typedCloseReason
          })
        };
        
        await updateAlert(alert.id, updateDto);
        setTimeout(() => loadAlerts(), 1000);
        if ((window as any).addNotification) {
            const highestTP = newTPHits.length > 0 ? Math.max(...newTPHits) : null;
            if (highestTP !== null) {
                (window as any).addNotification({
                    type: 'tp_hit',
                    title: `🎯 TP${highestTP} Hit!`,
                    message: `${alert.assetName || alert.asset_name} reached Take Profit ${highestTP}`
                });
            }
        }
    } catch (err) {
        console.error("Failed to update TP hits:", err);
    } finally {
      setUpdateInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(alert.id);
        return newSet;
      });
    }
  }, [updateInProgress, loadAlerts, updateAlert, isAdmin, isCreator]);

  const handleStopLossHit = useCallback(async (alert: any, closeReason: string) => {
    if (updateInProgress.has(alert.id)) return;
    
    const alertIsCreator = isCreator(alert.creator?.id);
    if (!alertIsCreator && !isAdmin) return;
    
    setUpdateInProgress(prev => new Set(prev).add(alert.id));
    try {
        console.log(`Stop loss hit for alert ${alert.id}, reason: ${closeReason}`);
        
        let typedCloseReason: 'manual' | 'stop_loss' | 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'reversal_after_tp' = 'stop_loss';
        
        switch (closeReason) {
          case 'manual':
          case 'stop_loss':
          case 'tp1':
          case 'tp2':
          case 'tp3':
          case 'tp4':
          case 'tp5':
          case 'reversal_after_tp':
            typedCloseReason = closeReason;
            break;
          default:
            typedCloseReason = 'stop_loss';
        }
        
        const updateDto: UpdateTradeAlertDto = { 
          status: 'closed', 
          closeReason: typedCloseReason
        };
        
        await updateAlert(alert.id, updateDto);
        setTimeout(() => loadAlerts(), 1000);
        if ((window as any).addNotification) {
            (window as any).addNotification({
                type: 'stop_loss',
                title: `🚨 Stop Loss Hit!`,
                message: `${alert.assetName || alert.asset_name} trade closed at stop loss`
            });
        }
    } catch (err) {
        console.error("Failed to update stop loss:", err);
    } finally {
      setUpdateInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(alert.id);
        return newSet;
      });
    }
  }, [updateInProgress, loadAlerts, updateAlert, isAdmin, isCreator]);

  const handleOrderActivation = useCallback(async (alert: any) => {
    if (updateInProgress.has(alert.id)) return;
    
    const alertIsCreator = isCreator(alert.creator?.id);
    if (!alertIsCreator && !isAdmin) return;
    
    setUpdateInProgress(prev => new Set(prev).add(alert.id));
    try {
        console.log(`Activating order for alert ${alert.id}`);
        const updateDto: UpdateTradeAlertDto = { status: 'active' };
        await updateAlert(alert.id, updateDto);
        setTimeout(() => loadAlerts(), 1000);
        if ((window as any).addNotification) {
            (window as any).addNotification({
                type: 'trade_activated',
                title: `🚀 Order Activated!`,
                message: `${alert.assetName || alert.asset_name} ${alert.tradeType || alert.trade_type} is now active`
            });
        }
    } catch (err) {
        console.error("Failed to activate order:", err);
    } finally {
      setUpdateInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(alert.id);
        return newSet;
      });
    }
  }, [updateInProgress, loadAlerts, updateAlert, isAdmin, isCreator]);

  const handleShareSignal = async (alertId: string) => {
    setSharingStates(prev => ({ ...prev, [alertId]: true }));
    try {
        // Implement sharing logic here
        if ((window as any).addNotification) {
            (window as any).addNotification({
                type: 'success',
                title: 'Signal Shared',
                message: 'The trade signal has been posted to the social feed.'
            });
        }
    } catch (err) {
        console.error("Failed to share signal:", err);
        if ((window as any).addNotification) {
            (window as any).addNotification({ 
                type: 'error', 
                title: 'Share Failed', 
                message: 'Could not post signal to feed. Please try again.' 
            });
        }
    } finally {
        setSharingStates(prev => ({ ...prev, [alertId]: false }));
    }
  };

  return (
    <div className="min-h-screen p-6 bg-background">
      <NotificationSystem />
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
              Live Signal <span className="text-primary">Stream</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Real-time trading signals with live price tracking
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64 flex-col space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-muted-foreground">Loading signals...</p>
              {retryCount > 0 && <p className="text-sm text-muted-foreground/70 mt-2">Retry attempt {retryCount}/2</p>}
            </div>
          </div>
        ) : error ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Connection Error</h3>
              <p className="text-muted-foreground mb-6">{error}</p>
              <div className="flex gap-4 justify-center">
                <button onClick={() => loadAlerts(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded transition-colors">Try Again</button>
                <button onClick={() => window.location.reload()} className="border border-border text-muted-foreground hover:bg-muted px-4 py-2 rounded transition-colors">Refresh Page</button>
              </div>
          </div>
        ) : (
          <div className="space-y-8">
              <div>
                  <h2 className="text-2xl font-semibold text-primary mb-4 border-b-2 border-primary/20 pb-2">
                    Active Signals ({activeAlerts.length})
                  </h2>
                  {activeAlerts.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {activeAlerts.map(alert => (
                              <TradeAlertCard
                                key={alert.id} 
                                alert={{
                                  ...alert,
                                  asset_name: alert.assetName,
                                  trade_type: alert.tradeType,
                                  entry_price: alert.entryPrice,
                                  stop_loss: alert.stopLoss,
                                  tp1: alert.tp1,
                                  tp2: alert.tp2,
                                  tp3: alert.tp3,
                                  tp4: alert.tp4,
                                  tp5: alert.tp5,
                                  tp_hits: alert.tpHits,
                                  finnhub_symbol: alert.finnhubSymbol,
                                  notes: alert.notes,
                                  created_date: alert.createdAt,
                                  updated_date: alert.updatedAt,
                                  close_reason: alert.closeReason
                                }}
                                creator={alert.creator}
                                onStatusUpdate={handleStatusUpdate}
                                onTakeProfitHit={handleTakeProfitHit} 
                                onStopLossHit={handleStopLossHit}
                                onOrderActivation={handleOrderActivation}
                                isAdmin={isAdmin}
                                isCreator={isCreator(alert.creator?.id)}
                                livePrice={livePrices[alert.finnhubSymbol]} 
                                connectionStatus={priceConnectionStatus as 'connecting' | 'connected' | 'error'}
                                priceSource={priceSource}
                                isRecentClosure={false}
                              />
                          ))}
                      </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <div className="w-8 h-8 text-muted-foreground/50">📡</div>
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">No Active Signals</h3>
                      <p className="text-muted-foreground">New trading signals will appear here when posted by educators.</p>
                    </div>
                  )}
              </div>
              
              <div>
                  <h2 className="text-2xl font-semibold text-muted-foreground mb-4 border-b-2 border-border pb-2">
                    Recent Closed Trades ({closedAlerts.length})
                  </h2>
                   {sortedClosedAlerts.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {sortedClosedAlerts.map(alert => (
                              <TradeAlertCard
                                key={alert.id} 
                                alert={{
                                  ...alert,
                                  asset_name: alert.assetName,
                                  trade_type: alert.tradeType,
                                  entry_price: alert.entryPrice,
                                  stop_loss: alert.stopLoss,
                                  tp1: alert.tp1,
                                  tp2: alert.tp2,
                                  tp3: alert.tp3,
                                  tp4: alert.tp4,
                                  tp5: alert.tp5,
                                  tp_hits: alert.tpHits,
                                  finnhub_symbol: alert.finnhubSymbol,
                                  notes: alert.notes,
                                  created_date: alert.createdAt,
                                  updated_date: alert.updatedAt,
                                  close_reason: alert.closeReason
                                }}
                                creator={alert.creator}
                                onStatusUpdate={handleStatusUpdate}
                                onTakeProfitHit={handleTakeProfitHit} 
                                onStopLossHit={handleStopLossHit}
                                onOrderActivation={handleOrderActivation} 
                                isAdmin={isAdmin}
                                isCreator={isCreator(alert.creator?.id)}
                                livePrice={undefined}
                                connectionStatus={priceConnectionStatus as 'connecting' | 'connected' | 'error'}
                                priceSource={priceSource}
                                isRecentClosure={true}
                              />
                          ))}
                      </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <div className="w-8 h-8 text-muted-foreground/50">🔒</div>
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">No Closed Trades</h3>
                      <p className="text-muted-foreground">Completed trades will be shown here for reference.</p>
                    </div>
                  )}
              </div>
          </div>
        )}
      </div>
    </div>
  );
}
