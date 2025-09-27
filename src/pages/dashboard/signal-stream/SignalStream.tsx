import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeNavigation } from '@/hooks/useSafeNavigation';
import { useOptimizedWebSocketPrices } from '@/hooks/useOptimizedWebSocketPrices';
import { CreateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { ErrorBoundary } from '@/components/error-boundary/ErrorBoundary';
import TradeAlertCard from '@/components/signals/TradeAlertCard';
import EconomicSidebar from '@/components/widgets/EconomicSidebar';
import OptimizedNewAlertForm from '@/components/signals/OptimizedNewAlertForm';
import { useSignalRealtime } from '@/contexts/SignalRealtimeContext';
import { TradeAlertData } from '@/types/components';
import { SignalCounts, FilterState, EducatorOption } from '@/types/dashboard';
import EnhancedSignalFilters from '@/components/dashboard/EnhancedSignalFilters';
import ConnectionStatusIndicator from '@/components/dashboard/ConnectionStatusIndicator';
import SignalStreamHeader from '@/components/dashboard/SignalStreamHeader';

// Default filter state for signal stream
const defaultFilters: FilterState = {
  status: 'all',
  type: 'all',
  tradeType: 'all',
  educator: 'all',
  asset: '',
  search: ''
};

const SignalStream: React.FC = () => {
  // Local state management
  const [filters, setFilters] = useState(defaultFilters);
  const [showNewAlertModal, setShowNewAlertModal] = useState(false);
  const [updatesInProgress, setUpdatesInProgress] = useState<Set<string>>(new Set());
  
  // PHASE 4: Static closed alerts - fetched once on mount, never updated live
  const [staticClosedAlerts, setStaticClosedAlerts] = useState<TradeAlertData[]>([]);
  const [closedAlertsLoaded, setClosedAlertsLoaded] = useState(false);
  
  // Core hooks
  const { user } = useAuth();
  const { navigate } = useSafeNavigation();
  
  // PHASE 1 & 2: Real-time signals with normalized state and instant synchronization
  const { 
    signals: allAlerts, 
    connectionStatus, 
    lastUpdated 
  } = useSignalRealtime(user?.id || '', true);
  
  // User role determination
  const isAdmin = user?.role === 'admin';
  const isEducator = user?.user_type === 'educator' || isAdmin;
  const canCreateSignals = isAdmin || isEducator;

  // PHASE 4: Static closed alerts fetch - one-time only on mount
  const fetchClosedAlerts = useCallback(async () => {
    if (closedAlertsLoaded) return;
    
    try {
      console.log('fetchClosedAlerts - Fetching static closed alerts...');
      
      const { data: closedSignalsData, error } = await supabase
        .from('trade_alerts')
        .select(`
          *,
          profiles!user_id (
            id,
            display_name,
            role,
            avatar_url,
            user_type,
            access_level
          )
        `)
        .eq('status', 'closed')
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) {
        console.error('fetchClosedAlerts - Supabase error:', error);
        return;
      }

      if (closedSignalsData) {
        const transformedClosedAlerts: TradeAlertData[] = closedSignalsData.map(signal => ({
          id: signal.id,
          asset_name: signal.asset_name,
          tradermade_symbol: signal.tradermade_symbol,
          trade_type: signal.trade_type as 'buy' | 'sell' | 'buy_limit' | 'sell_limit',
          entry_price: signal.entry_price || 0,
          stop_loss: signal.stop_loss || 0,
          tp1: signal.tp1,
          tp2: signal.tp2,
          tp3: signal.tp3,
          tp4: signal.tp4,
          tp5: signal.tp5,
          status: signal.status as 'pending' | 'active' | 'closed' | 'partially_profited',
          tp_hits: signal.tp_hits || [],
          notes: signal.notes,
          close_reason: signal.close_reason,
          created_at: signal.created_at,
          updated_at: signal.updated_at,
          user_id: signal.user_id,
          creator: signal.profiles ? {
            id: signal.profiles.id,
            display_name: signal.profiles.display_name || 'Unknown',
            role: signal.profiles.role || 'user',
            avatar_url: signal.profiles.avatar_url,
            user_type: signal.profiles.user_type,
            access_level: signal.profiles.access_level
          } : {
            id: signal.user_id,
            display_name: 'Unknown',
            role: 'user'
          }
        }));
        
        setStaticClosedAlerts(transformedClosedAlerts);
        setClosedAlertsLoaded(true);
        
        console.log('fetchClosedAlerts - Successfully loaded static closed alerts:', transformedClosedAlerts.length);
      }
    } catch (err) {
      console.error('fetchClosedAlerts - Error fetching closed alerts:', err);
    }
  }, [closedAlertsLoaded]);

  // Mount effect - fetch static closed alerts once
  useEffect(() => {
    fetchClosedAlerts();
  }, [fetchClosedAlerts]);
  
  // PHASE 1: Transform TradeAlertWithProfile to TradeAlertData for consistent rendering
  const activeAlerts: TradeAlertData[] = useMemo(() => {
    return Object.values(allAlerts)
      .filter(alert => alert.status === 'active' || alert.status === 'partially_profited')
      .map(alert => ({
        id: alert.id,
        asset_name: alert.assetName,
        tradermade_symbol: alert.tradermadeSymbol,
        trade_type: alert.tradeType,  
        entry_price: alert.entryPrice,
        stop_loss: alert.stopLoss,
        tp1: alert.tp1,
        tp2: alert.tp2,
        tp3: alert.tp3,
        tp4: alert.tp4,
        tp5: alert.tp5,
        status: alert.status,
        tp_hits: alert.tpHits || [],
        notes: alert.notes,
        close_reason: alert.closeReason,
        created_at: alert.createdAt,
        updated_at: alert.updatedAt,
        user_id: alert.userId,
        creator: alert.creator
      }));
  }, [allAlerts]);

  // Educator options for filtering
  const educatorOptions = useMemo(() => {
    const educators = new Set<string>();
    Object.values(allAlerts).forEach(alert => {
      if (alert.creator?.display_name) {
        educators.add(alert.creator.display_name);
      }
    });
    return Array.from(educators);
  }, [allAlerts]);

  // Signal counts for display
  const signalCounts = useMemo(() => {
    const active = activeAlerts.length;
    const closed = staticClosedAlerts.length;
    const buy = activeAlerts.filter(alert => alert.trade_type === 'buy' || alert.trade_type === 'buy_limit').length;
    const sell = activeAlerts.filter(alert => alert.trade_type === 'sell' || alert.trade_type === 'sell_limit').length;
    
    return { active, closed, buy, sell };
  }, [activeAlerts, staticClosedAlerts]);

  // Create signal handler
  const handleCreateSignal = useCallback(async (signalData: CreateTradeAlertDto) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create signals",
        variant: "destructive",
      });
      return false;
    }

    if (!canCreateSignals) {
      toast({
        title: "Access Denied",
        description: "Only educators and admins can create signals",
        variant: "destructive",
      });
      return false;
    }

    try {
      console.log('Creating new signal:', signalData);
      
      const { data, error } = await supabase
        .from('trade_alerts')
        .insert([{
          user_id: user.id,
          asset_name: signalData.assetName,
          tradermade_symbol: signalData.tradermadeSymbol,
          trade_type: signalData.tradeType,
          entry_price: signalData.entryPrice,
          stop_loss: signalData.stopLoss,
          tp1: signalData.tp1,
          tp2: signalData.tp2,
          tp3: signalData.tp3,
          tp4: signalData.tp4,
          tp5: signalData.tp5,
          notes: signalData.notes,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: "Signal Created",
        description: `${signalData.assetName} signal created successfully`,
      });

      setShowNewAlertModal(false);
      return true;
    } catch (error) {
      console.error('Error creating signal:', error);
      toast({
        title: "Creation Failed",
        description: "Failed to create signal. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [user, canCreateSignals]);

  // Status update handler
  const handleStatusUpdate = useCallback(async (alertId: string, newStatus: string) => {
    if (updatesInProgress.has(alertId)) return;

    setUpdatesInProgress(prev => new Set(prev).add(alertId));
    
    try {
      await updateAlert(alertId, { status: newStatus as any });
      
      toast({
        title: "Status Updated",
        description: `Signal status updated to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update signal status",
        variant: "destructive",
      });
    } finally {
      setUpdatesInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(alertId);
        return newSet;
      });
    }
  }, [updateAlert, updatesInProgress]);

  // Take profit hit handler
  const handleTakeProfitHit = useCallback(async (alertId: string, tpLevel: number) => {
    if (updatesInProgress.has(alertId)) return;

    setUpdatesInProgress(prev => new Set(prev).add(alertId));
    
    try {
      const alert = Object.values(allAlerts).find(a => a.id === alertId);
      if (!alert) return;

      const currentTpHits = alert.tpHits || [];
      const newTpHits = [...currentTpHits, tpLevel].sort((a, b) => a - b);
      
      await updateAlert(alertId, { tpHits: newTpHits });
      
      toast({
        title: "Take Profit Hit",
        description: `TP${tpLevel} hit for ${alert.assetName}`,
      });
    } catch (error) {
      console.error('Error updating take profit hit:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update take profit hit",
        variant: "destructive",
      });
    } finally {
      setUpdatesInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(alertId);
        return newSet;
      });
    }
  }, [updateAlert, updatesInProgress, allAlerts]);

  // Stop loss hit handler
  const handleStopLossHit = useCallback(async (alertId: string) => {
    if (updatesInProgress.has(alertId)) return;

    setUpdatesInProgress(prev => new Set(prev).add(alertId));
    
    try {
      await updateAlert(alertId, { 
        status: 'closed',
        closeReason: 'stop_loss'
      });
      
      const alert = Object.values(allAlerts).find(a => a.id === alertId);
      toast({
        title: "Stop Loss Hit",
        description: `Stop loss hit for ${alert?.assetName || 'signal'}`,
        variant: "destructive",
      });
    } catch (error) {
      console.error('Error updating stop loss hit:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update stop loss hit",
        variant: "destructive",
      });
    } finally {
      setUpdatesInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(alertId);
        return newSet;
      });
    }
  }, [updateAlert, updatesInProgress, allAlerts]);

  // Activate order handler
  const handleActivateOrder = useCallback(async (alertId: string) => {
    if (updatesInProgress.has(alertId)) return;

    setUpdatesInProgress(prev => new Set(prev).add(alertId));
    
    try {
      await updateAlert(alertId, { status: 'active' });
      
      const alert = Object.values(allAlerts).find(a => a.id === alertId);
      toast({
        title: "Order Activated",
        description: `${alert?.assetName || 'Signal'} order activated`,
      });
    } catch (error) {
      console.error('Error activating order:', error);
      toast({
        title: "Activation Failed",
        description: "Failed to activate order",
        variant: "destructive",
      });
    } finally {
      setUpdatesInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(alertId);
        return newSet;
      });
    }
  }, [updateAlert, updatesInProgress, allAlerts]);

  // WebSocket price subscription
  const symbols = useMemo(() => {
    return Array.from(new Set([
      ...activeAlerts.map(alert => alert.tradermade_symbol),
      ...staticClosedAlerts.slice(0, 5).map(alert => alert.tradermade_symbol)
    ]));
  }, [activeAlerts, staticClosedAlerts]);
  
  const { 
    prices: rawPrices, 
    subscribe: subscribeToPrice, 
    unsubscribe: unsubscribeFromPrice,
    connectionStatus: priceConnectionStatus 
  } = useOptimizedWebSocketPrices();
  
  const symbolPrices = useMemo(() => {
    const priceMap: Record<string, { price: number; bid?: number; ask?: number }> = {};
    Object.entries(rawPrices).forEach(([symbol, priceData]) => {
      priceMap[symbol] = {
        price: priceData.mid || priceData.price || 0,
        bid: priceData.bid,
        ask: priceData.ask
      };
    });
    return priceMap;
  }, [rawPrices]);

  // Subscribe to symbol prices
  useEffect(() => {
    symbols.forEach(symbol => subscribeToPrice(symbol));
    return () => {
      symbols.forEach(symbol => unsubscribeFromPrice(symbol));
    };
  }, [symbols, subscribeToPrice, unsubscribeFromPrice]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <SignalStreamHeader 
            signalCounts={signalCounts}
            canCreateSignals={canCreateSignals}
            onCreateSignal={() => setShowNewAlertModal(true)}
          />

          {/* Filters and Connection Status */}
          <div className="mb-6 space-y-4">
            <EnhancedSignalFilters 
              filters={filters}
              onFiltersChange={setFilters}
              educatorOptions={educatorOptions}
            />
            <ConnectionStatusIndicator 
              connectionStatus={connectionStatus}
              priceConnectionStatus={priceConnectionStatus}
              lastUpdated={lastUpdated}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Signals Column */}
            <div className="lg:col-span-3 space-y-6">
              {/* Active Signals Section */}
              <div className="bg-card rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Active Signals</h2>
                  <span className="text-sm text-muted-foreground">
                    {activeAlerts.length} active
                  </span>
                </div>
                
                {isLoading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading signals...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <p className="text-destructive">Error loading signals: {error}</p>
                  </div>
                ) : activeAlerts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No active signals</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeAlerts.map((alert) => (
                      <TradeAlertCard 
                        key={`active-${alert.id}`}
                        alert={alert}
                        currentPrice={symbolPrices[alert.tradermade_symbol]?.price}
                        onStatusUpdate={(alert, newStatus) => handleStatusUpdate(alert.id, newStatus)}
                        onTakeProfitHit={(alert, newTPHits) => handleTakeProfitHit(alert.id, newTPHits[0])}
                        onStopLossHit={(alert) => handleStopLossHit(alert.id)}
                        onActivateOrder={(alert) => handleActivateOrder(alert.id)}
                        updatesInProgress={updatesInProgress}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Closed Signals Section - Static Display */}
              <div className="bg-card rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Recent Closed Signals</h2>
                  <span className="text-sm text-muted-foreground">
                    {staticClosedAlerts.length} recent
                  </span>
                </div>
                
                {!closedAlertsLoaded ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading closed signals...</p>
                  </div>
                ) : staticClosedAlerts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No recent closed signals</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {staticClosedAlerts.map((alert) => (
                      <TradeAlertCard 
                        key={`closed-${alert.id}`}
                        alert={alert}
                        currentPrice={symbolPrices[alert.tradermade_symbol]?.price}
                        onStatusUpdate={(alert, newStatus) => handleStatusUpdate(alert.id, newStatus)}
                        onTakeProfitHit={(alert, newTPHits) => handleTakeProfitHit(alert.id, newTPHits[0])}
                        onStopLossHit={(alert) => handleStopLossHit(alert.id)}
                        onActivateOrder={(alert) => handleActivateOrder(alert.id)}
                        updatesInProgress={updatesInProgress}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Economic Sidebar */}
            <div className="lg:col-span-1">
              <EconomicSidebar />
            </div>
          </div>
        </div>

        {/* New Signal Modal */}
        {showNewAlertModal && (
          <OptimizedNewAlertForm
            isOpen={showNewAlertModal}
            onClose={() => setShowNewAlertModal(false)}
            onSubmit={handleCreateSignal}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default SignalStream;