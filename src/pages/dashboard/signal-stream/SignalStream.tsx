import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOptimizedTrading } from '@/hooks/useOptimizedTrading';
import { CreateTradeAlertDto, UpdateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { Loader2, AlertTriangle } from 'lucide-react';
import TradeAlertCard from '@/components/signals/TradeAlertCard';
import NotificationSystem from '@/components/notifications/NotificationSystem';
import EconomicSidebar from '@/components/widgets/EconomicSidebar';
import usePriceFeed from '@/components/hooks/usePriceFeed';
import { supabase } from '@/integrations/supabase/client';

export default function SignalStream() {
  const [user, setUser] = useState<any>(null);

  // Get user ID first
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
    fetchUser();
  }, []);

  // Use the optimized trading hook
  const {
    alerts,
    isLoading,
    error,
    updateAlert,
    refreshAlerts
  } = useOptimizedTrading(user?.id || '');

  const { activeAlerts, closedAlerts } = useMemo(() => {
    const active = alerts.filter(a => a.status === 'active' || a.status === 'pending');
    const closed = alerts.filter(a => a.status === 'closed');
    return { activeAlerts: active, closedAlerts: closed };
  }, [alerts]);

  const sortedClosedAlerts = useMemo(() => {
    return [...closedAlerts]
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
      .slice(0, 12);
  }, [closedAlerts]);
  
  const symbols = useMemo(() => {
    const symbolSet = new Set();
    
    activeAlerts.forEach(alert => {
      if (alert && alert.finnhubSymbol) {
        symbolSet.add(alert.finnhubSymbol);
      }
    });
    
    const symbolList = Array.from(symbolSet);
    console.log('SignalStream - Final symbols for price feed:', symbolList);
    return symbolList as string[];
  }, [activeAlerts]);

  const { prices: livePrices, connectionStatus, priceSource } = usePriceFeed(symbols);

  const [updateInProgress, setUpdateInProgress] = useState(new Set<string>());

  const handleStatusUpdate = useCallback(async (alert: any, newStatus: string) => {
    if (updateInProgress.has(alert.id)) return;
    setUpdateInProgress(prev => new Set(prev).add(alert.id));
    
    try {
      console.log(`Updating alert ${alert.id} status to ${newStatus}`);
      const updateDto: UpdateTradeAlertDto = { 
        status: newStatus as 'pending' | 'active' | 'closed', 
        closeReason: newStatus === 'closed' ? 'manual' : undefined 
      };
      
      const result = await updateAlert(alert.id, updateDto);
      
      if (result && newStatus === 'closed' && (window as any).addNotification) {
        (window as any).addNotification({
          type: 'trade_closed',
          title: `🔒 Trade Closed`,
          message: `${alert.assetName} trade has been manually closed`
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
  }, [updateInProgress, updateAlert]);

  const handleTakeProfitHit = useCallback(async (alert: any, newTPHits: number[], shouldAutoClose = false, closeReason: string | null = null) => {
    if (updateInProgress.has(alert.id)) return;
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
      
      const result = await updateAlert(alert.id, updateDto);
      
      if (result && (window as any).addNotification) {
        const highestTP = newTPHits.length > 0 ? Math.max(...newTPHits) : null;
        if (highestTP !== null) {
          (window as any).addNotification({
            type: 'tp_hit',
            title: `🎯 TP${highestTP} Hit!`,
            message: `${alert.assetName} reached Take Profit ${highestTP}`
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
  }, [updateInProgress, updateAlert]);

  const handleStopLossHit = useCallback(async (alert: any, closeReason: string) => {
    if (updateInProgress.has(alert.id)) return;
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
      
      const result = await updateAlert(alert.id, updateDto);
      
      if (result && (window as any).addNotification) {
        (window as any).addNotification({
          type: 'stop_loss',
          title: `🚨 Stop Loss Hit!`,
          message: `${alert.assetName} trade closed at stop loss`
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
  }, [updateInProgress, updateAlert]);

  const handleOrderActivation = useCallback(async (alert: any) => {
    if (updateInProgress.has(alert.id)) return;
    setUpdateInProgress(prev => new Set(prev).add(alert.id));
    
    try {
      console.log(`Activating order for alert ${alert.id}`);
      const updateDto: UpdateTradeAlertDto = { status: 'active' };
      
      const result = await updateAlert(alert.id, updateDto);
      
      if (result && (window as any).addNotification) {
        (window as any).addNotification({
          type: 'trade_activated',
          title: `🚀 Order Activated!`,
          message: `${alert.assetName} ${alert.tradeType} is now active`
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
  }, [updateInProgress, updateAlert]);

  return (
    <div className="min-h-screen bg-background">
      <NotificationSystem />
      
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">
              Live Signal <span className="text-accent-green">Stream</span>
            </h1>
            <p className="text-muted-foreground">
              Real-time trading signals with live price tracking
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3">
            {isLoading ? (
              <div className="flex justify-center items-center h-64 flex-col space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-accent-green" />
                <div className="text-center">
                  <p className="text-muted-foreground">Loading signals...</p>
                </div>
              </div>
            ) : error ? (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Connection Error</h3>
                <p className="text-muted-foreground mb-6">{error}</p>
                <div className="flex gap-4 justify-center">
                  <button onClick={() => refreshAlerts()} className="bg-accent-green hover:bg-accent-green/90 text-white px-4 py-2 rounded">Try Again</button>
                  <button onClick={() => window.location.reload()} className="border border-border text-muted-foreground hover:bg-muted px-4 py-2 rounded">Refresh Page</button>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-semibold text-accent-green mb-4 border-b border-accent-green/20 pb-2">
                    Active Signals ({activeAlerts.length})
                  </h2>
                  {activeAlerts.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {activeAlerts.map(alert => (
                        <TradeAlertCard
                          key={alert.id} 
                          alert={{
                            ...alert,
                            asset_name: alert.assetName,
                            finnhub_symbol: alert.finnhubSymbol,
                            trade_type: alert.tradeType,
                            entry_price: alert.entryPrice,
                            stop_loss: alert.stopLoss,
                            tp_hits: alert.tpHits,
                            close_reason: alert.closeReason,
                            created_date: alert.createdAt,
                            updated_date: alert.updatedAt
                          }} 
                          onStatusUpdate={handleStatusUpdate}
                          onTakeProfitHit={handleTakeProfitHit} 
                          onStopLossHit={handleStopLossHit}
                          onOrderActivation={handleOrderActivation} 
                          isAdmin={user?.user_metadata?.access_level === 'admin' || user?.user_metadata?.role === 'admin'}
                          livePrice={livePrices[alert.finnhubSymbol]} 
                          connectionStatus={connectionStatus as 'connecting' | 'connected' | 'error'}
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
                  <h2 className="text-xl font-semibold text-muted-foreground mb-4 border-b border-border pb-2">
                    Recent Closed Trades ({closedAlerts.length})
                  </h2>
                  {sortedClosedAlerts.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {sortedClosedAlerts.map(alert => (
                        <TradeAlertCard
                          key={alert.id} 
                          alert={{
                            ...alert,
                            asset_name: alert.assetName,
                            finnhub_symbol: alert.finnhubSymbol,
                            trade_type: alert.tradeType,
                            entry_price: alert.entryPrice,
                            stop_loss: alert.stopLoss,
                            tp_hits: alert.tpHits,
                            close_reason: alert.closeReason,
                            created_date: alert.createdAt,
                            updated_date: alert.updatedAt
                          }}
                          onStatusUpdate={handleStatusUpdate}
                          onTakeProfitHit={handleTakeProfitHit} 
                          onStopLossHit={handleStopLossHit}
                          onOrderActivation={handleOrderActivation}
                          isAdmin={user?.user_metadata?.access_level === 'admin' || user?.user_metadata?.role === 'admin'}
                          livePrice={undefined}
                          connectionStatus={connectionStatus as 'connecting' | 'connected' | 'error'}
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
          
          <div className="xl:col-span-1">
            <div className="sticky top-6 space-y-4">
              <EconomicSidebar />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
