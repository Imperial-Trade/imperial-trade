import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TradeAlert } from '@/api/entities';
import { Loader2, AlertTriangle } from 'lucide-react';
import TradeAlertCard from '@/components/signals/TradeAlertCard';
import NotificationSystem from '@/components/notifications/NotificationSystem';
import usePriceFeed from '@/components/hooks/usePriceFeed';
import { supabase } from '@/integrations/supabase/client';

export default function SignalStream() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const loadAlerts = useCallback(async (isInitialLoad = false, retryAttempt = 0) => {
    if (isInitialLoad) {
        setIsLoading(true);
    }
    setError(null);
    
    try {
      console.log(`Loading alerts - attempt ${retryAttempt + 1}`);
      const fetchedAlerts = await TradeAlert.list('-created_date', 50);
      console.log(`Successfully loaded ${fetchedAlerts.length} alerts`);
      setAlerts(fetchedAlerts);
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
      setError('Failed to load signals. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user: currentUser }, error } = await supabase.auth.getUser();
        if (error) throw error;
        setUser(currentUser);
      } catch (e) {
        console.log('User not logged in:', e);
      }
    };

    // --- Real-time Update Logic ---
    const handleSignalPosted = () => {
        console.log('New signal event received, reloading alerts instantly.');
        loadAlerts(false);
    };

    window.addEventListener('signal-posted', handleSignalPosted);
    // --- End Real-time Logic ---

    fetchUser();
    loadAlerts(true);
    // The polling interval is a fallback in case the event listener fails.
    // Reduced from 90s to 30s for better responsiveness.
    const interval = setInterval(() => loadAlerts(false), 30000); 

    return () => {
        clearInterval(interval);
        window.removeEventListener('signal-posted', handleSignalPosted);
    };
  }, [loadAlerts]);

  const { activeAlerts, closedAlerts } = useMemo(() => {
    const safeAlerts = Array.isArray(alerts) ? alerts : [];
    const active = safeAlerts.filter(a => a.status === 'active' || a.status === 'pending');
    const closed = safeAlerts.filter(a => a.status === 'closed');
    return { activeAlerts: active, closedAlerts: closed };
  }, [alerts]);

  const sortedClosedAlerts = useMemo(() => {
      return Array.isArray(closedAlerts) ? [...closedAlerts]
        .sort((a, b) => new Date(b.updated_date || 0).getTime() - new Date(a.updated_date || 0).getTime())
        .slice(0, 12) : [];
  }, [closedAlerts]);
  
  const symbols = useMemo(() => {
    const symbolSet = new Set();
    const safeActiveAlerts = Array.isArray(activeAlerts) ? activeAlerts : [];
    
    safeActiveAlerts.forEach(alert => {
      // The symbol should now be stored correctly. Just add it.
      if (alert && alert.finnhub_symbol) {
        symbolSet.add(alert.finnhub_symbol);
      }
    });
    
    const symbolList = Array.from(symbolSet);
    console.log('SignalStream - Final symbols for price feed:', symbolList);
    return symbolList as string[];
  }, [activeAlerts]);

  const { prices: livePrices, connectionStatus, priceSource } = usePriceFeed(symbols);

  // Debug logging for price updates
  useEffect(() => {
    console.log('SignalStream - Live prices updated:', livePrices);
    console.log('SignalStream - Connection status:', connectionStatus);
    console.log('SignalStream - Price source:', priceSource);
  }, [livePrices, connectionStatus, priceSource]);

  const [updateInProgress, setUpdateInProgress] = useState(new Set<string>());

  const handleStatusUpdate = useCallback(async (alert: any, newStatus: string) => {
      if (updateInProgress.has(alert.id)) return;
      setUpdateInProgress(prev => new Set(prev).add(alert.id));
      try {
          console.log(`Updating alert ${alert.id} status to ${newStatus}`);
          const updatePayload = { ...alert, status: newStatus, close_reason: newStatus === 'closed' ? 'manual' : null };
          await TradeAlert.update(alert.id, updatePayload);
          setTimeout(() => loadAlerts(), 1000);
          if (newStatus === 'closed' && (window as any).addNotification) {
            (window as any).addNotification({
              type: 'trade_closed',
              title: `🔒 Trade Closed`,
              message: `${alert.asset_name} trade has been manually closed`
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
  }, [updateInProgress, loadAlerts]);

  const handleTakeProfitHit = useCallback(async (alert: any, newTPHits: number[], shouldAutoClose = false, closeReason: string | null = null) => {
    if (updateInProgress.has(alert.id)) return;
    setUpdateInProgress(prev => new Set(prev).add(alert.id));
    try {
        console.log(`Updating TP hits for alert ${alert.id}:`, newTPHits);
        let updatePayload = { ...alert, tp_hits: newTPHits };
        if (shouldAutoClose) {
            updatePayload.status = 'closed';
            updatePayload.close_reason = closeReason;
        }
        await TradeAlert.update(alert.id, updatePayload);
        setTimeout(() => loadAlerts(), 1000);
        if ((window as any).addNotification) {
            const highestTP = newTPHits.length > 0 ? Math.max(...newTPHits) : null;
            if (highestTP !== null) {
                (window as any).addNotification({
                    type: 'tp_hit',
                    title: `🎯 TP${highestTP} Hit!`,
                    message: `${alert.asset_name} reached Take Profit ${highestTP}`
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
  }, [updateInProgress, loadAlerts]);

  const handleStopLossHit = useCallback(async (alert: any, closeReason: string) => {
    if (updateInProgress.has(alert.id)) return;
    setUpdateInProgress(prev => new Set(prev).add(alert.id));
    try {
        console.log(`Stop loss hit for alert ${alert.id}, reason: ${closeReason}`);
        const updatePayload = { ...alert, status: 'closed', close_reason: closeReason };
        await TradeAlert.update(alert.id, updatePayload);
        setTimeout(() => loadAlerts(), 1000);
        if ((window as any).addNotification) {
            (window as any).addNotification({
                type: 'stop_loss',
                title: `🚨 Stop Loss Hit!`,
                message: `${alert.asset_name} trade closed at stop loss`
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
  }, [updateInProgress, loadAlerts]);

  const handleOrderActivation = useCallback(async (alert: any) => {
    if (updateInProgress.has(alert.id)) return;
    setUpdateInProgress(prev => new Set(prev).add(alert.id));
    try {
        console.log(`Activating order for alert ${alert.id}`);
        await TradeAlert.update(alert.id, { ...alert, status: 'active' });
        setTimeout(() => loadAlerts(), 1000);
        if ((window as any).addNotification) {
            (window as any).addNotification({
                type: 'trade_activated',
                title: `🚀 Order Activated!`,
                message: `${alert.asset_name} ${alert.trade_type} is now active`
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
  }, [updateInProgress, loadAlerts]);

  return (
    <div className="min-h-screen p-6 bg-background">
      <NotificationSystem />
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-primary mb-2">
              Live Signal <span className="text-accent-green">Stream</span>
            </h1>
            <p className="text-secondary text-lg">
              Real-time trading signals with live price tracking
            </p>
          </div>
          {/* Removed New Signal button - now only in Admin Panel */}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64 flex-col space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-accent-green" />
            <div className="text-center">
              <p className="text-secondary">Loading signals...</p>
              {retryCount > 0 && <p className="text-sm text-secondary/70 mt-2">Retry attempt {retryCount}/2</p>}
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-accent-red mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-primary mb-2">Connection Error</h3>
              <p className="text-secondary mb-6">{error}</p>
              <div className="flex gap-4 justify-center">
                <button onClick={() => loadAlerts(true)} className="bg-accent-green hover:bg-green-500 text-white px-4 py-2 rounded">Try Again</button>
                <button onClick={() => window.location.reload()} className="border border-default text-secondary hover:bg-surface px-4 py-2 rounded">Refresh Page</button>
              </div>
          </div>
        ) : (
          <div className="space-y-8">
              <div>
                  <h2 className="text-2xl font-semibold text-accent-green mb-4 border-b-2 border-accent-green/20 pb-2">
                    Active Signals ({activeAlerts.length})
                  </h2>
                  {activeAlerts.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {activeAlerts.map(alert => (
                              <TradeAlertCard
                                key={alert.id} 
                                alert={alert} 
                                onStatusUpdate={handleStatusUpdate}
                                onTakeProfitHit={handleTakeProfitHit} 
                                onStopLossHit={handleStopLossHit}
                                onOrderActivation={handleOrderActivation} 
                                isAdmin={user?.user_metadata?.access_level === 'admin' || user?.user_metadata?.role === 'admin'}
                                livePrice={livePrices[alert.finnhub_symbol]} 
                                connectionStatus={connectionStatus}
                                priceSource={priceSource}
                                isRecentClosure={false}
                              />
                          ))}
                      </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
                        <div className="w-8 h-8 text-secondary/50">📡</div>
                      </div>
                      <h3 className="text-xl font-semibold text-primary mb-2">No Active Signals</h3>
                      <p className="text-secondary">New trading signals will appear here when posted by educators.</p>
                    </div>
                  )}
              </div>
              
              <div>
                  <h2 className="text-2xl font-semibold text-secondary mb-4 border-b-2 border-default pb-2">
                    Recent Closed Trades ({closedAlerts.length})
                  </h2>
                   {sortedClosedAlerts.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {sortedClosedAlerts.map(alert => (
                              <TradeAlertCard
                                key={alert.id} 
                                alert={alert}
                                onStatusUpdate={handleStatusUpdate}
                                onTakeProfitHit={handleTakeProfitHit} 
                                onStopLossHit={handleStopLossHit}
                                onOrderActivation={handleOrderActivation}
                                isAdmin={user?.user_metadata?.access_level === 'admin' || user?.user_metadata?.role === 'admin'}
                                livePrice={undefined}
                                connectionStatus={connectionStatus}
                                priceSource={priceSource}
                                isRecentClosure={true}
                              />
                          ))}
                      </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
                        <div className="w-8 h-8 text-secondary/50">🔒</div>
                      </div>
                      <h3 className="text-xl font-semibold text-primary mb-2">No Closed Trades</h3>
                      <p className="text-secondary">Completed trades will be shown here for reference.</p>
                    </div>
                  )}
              </div>
          </div>
        )}
      </div>
    </div>
  );
}
