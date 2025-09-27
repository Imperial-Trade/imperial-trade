import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeNavigation } from '@/hooks/useSafeNavigation';
import { useOptimizedWebSocketPrices } from '@/hooks/useOptimizedWebSocketPrices';
import { CreateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { transformTradeAlertToFrontend } from '@/utils/dataTransformers';
import { ErrorBoundary } from '@/components/error-boundary/ErrorBoundary';
import TradeAlertCard from '@/components/signals/TradeAlertCard';
import EconomicSidebar from '@/components/widgets/EconomicSidebar';
import OptimizedNewAlertForm from '@/components/signals/OptimizedNewAlertForm';
import { useSignalRealtime } from '@/contexts/SignalRealtimeContext';
import { TradeAlertWithProfile } from '@/utils/dataTransformers';
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
  const [staticClosedAlerts, setStaticClosedAlerts] = useState<TradeAlertWithProfile[]>([]);
  const [closedAlertsLoaded, setClosedAlertsLoaded] = useState(false);
  
  // Core hooks
  const { user } = useAuth();
  const { navigate } = useSafeNavigation();
  
  // PHASE 1 & 2: Real-time signals with normalized state and instant synchronization
  const { 
    signals: allAlerts, 
    connectionStatus, 
    lastUpdated 
  } = useSignalRealtime();
  
  // User role determination
  const isAdmin = user?.role === 'admin';
  const isEducator = (user as any)?.user_type === 'educator' || isAdmin;
  const canCreateSignals = isAdmin || isEducator;

  // Create updateAlert function for signal updates
  const updateAlert = useCallback(async (id: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('trade_alerts')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('updateAlert error:', error);
      throw error;
    }
  }, []);

  // PHASE 4: Static closed alerts fetch - one-time only on mount
  const fetchClosedAlerts = useCallback(async () => {
    if (closedAlertsLoaded) return;
    
    try {
      console.log('fetchClosedAlerts - Fetching static closed alerts...');
      
      const { data: closedSignalsData, error } = await supabase
        .from('trade_alerts')
        .select(`
          *
        `)
        .eq('status', 'closed')
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) {
        console.error('fetchClosedAlerts - Supabase error:', error);
        return;
      }

      if (closedSignalsData) {
        // Fetch profiles separately to avoid relationship issues
        const userIds = [...new Set(closedSignalsData.map(signal => signal.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, display_name, role, avatar_url, user_type, access_level')
          .in('id', userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

        const transformedClosedAlerts: TradeAlertWithProfile[] = closedSignalsData.map(signal => 
          transformTradeAlertToFrontend({
            id: signal.id,
            user_id: signal.user_id,
            asset_name: signal.asset_name,
            tradermade_symbol: signal.tradermade_symbol,
            trade_type: signal.trade_type,
            entry_price: signal.entry_price,
            stop_loss: signal.stop_loss,
            status: signal.status,
            tp1: signal.tp1,
            tp2: signal.tp2,
            tp3: signal.tp3,
            tp4: signal.tp4,
            tp5: signal.tp5,
            tp_hits: signal.tp_hits,
            notes: signal.notes,
            close_reason: signal.close_reason,
            created_at: signal.created_at,
            updated_at: signal.updated_at,
            profiles: profilesMap.get(signal.user_id) || null
          })
        );

        console.log('fetchClosedAlerts - Setting static closed alerts:', transformedClosedAlerts.length);
        setStaticClosedAlerts(transformedClosedAlerts);
        setClosedAlertsLoaded(true);
      }
    } catch (error) {
      console.error('fetchClosedAlerts - Error:', error);
    }
  }, [closedAlertsLoaded]);

  // Fetch closed alerts once on mount
  useEffect(() => {
    fetchClosedAlerts();
  }, [fetchClosedAlerts]);

  // PHASE 1: Normalized state - convert Record to filtered array
  const activeAlerts = useMemo(() => {
    const alertsArray = Object.values(allAlerts).filter(alert => 
      alert.status === 'active' || alert.status === 'partially_profited'
    );

    console.log('activeAlerts - Transformed from normalized state:', {
      totalAlerts: Object.keys(allAlerts).length,
      activeCount: alertsArray.length,
      allStatuses: Object.values(allAlerts).map(a => a.status)
    });

    return alertsArray;
  }, [allAlerts]);

  // PHASE 2: Enhanced educator options for filters
  const educatorOptions: EducatorOption[] = useMemo(() => {
    const educators = new Map<string, string>();
    
    Object.values(allAlerts).forEach(alert => {
      if (alert.creator?.displayName) {
        educators.set(alert.creator.id, alert.creator.displayName);
      }
    });

    return Array.from(educators.entries()).map(([id, name]) => ({
      value: id,
      label: name
    }));
  }, [allAlerts]);

  // PHASE 3: Enhanced signal counts
  const signalCounts: SignalCounts = useMemo(() => {
    const counts = {
      all: activeAlerts.length + staticClosedAlerts.length,
      active: activeAlerts.length,
      closed: staticClosedAlerts.length,
      pending: activeAlerts.filter(alert => alert.status === 'pending').length,
      buy: activeAlerts.filter(alert => alert.tradeType === 'buy' || alert.tradeType === 'buy_limit').length,
      sell: activeAlerts.filter(alert => alert.tradeType === 'sell' || alert.tradeType === 'sell_limit').length
    };

    console.log('signalCounts - Updated counts:', counts);
    return counts;
  }, [activeAlerts, staticClosedAlerts]);

  // Create signal handler
  const handleCreateSignal = useCallback(async (signalData: CreateTradeAlertDto): Promise<void> => {
    if (!user) {
      toast("Authentication required - please log in to create signals");
      return;
    }

    if (!canCreateSignals) {
      toast("Access denied - only educators and admins can create signals");
      return;
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

      toast(`${signalData.assetName} signal created successfully`);

      setShowNewAlertModal(false);
    } catch (error) {
      console.error('Error creating signal:', error);
      toast("Failed to create signal. Please try again.");
    }
  }, [user, canCreateSignals]);

  // Status update handler
  const handleStatusUpdate = useCallback(async (alert: TradeAlertWithProfile, newStatus: string) => {
    try {
      setUpdatesInProgress(prev => new Set(prev).add(alert.id));
      
      await updateAlert(alert.id, { status: newStatus });
      
      toast("Signal status updated successfully");
    } catch (error) {
      console.error('handleStatusUpdate error:', error);
      toast("Failed to update signal status");
    } finally {
      setUpdatesInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(alert.id);
        return newSet;
      });
    }
  }, [updateAlert]);

  const handleTakeProfitHit = useCallback(async (alert: TradeAlertWithProfile, newTPHits: number[], shouldAutoClose?: boolean, closeReason?: string) => {
    try {
      setUpdatesInProgress(prev => new Set(prev).add(alert.id));
      
      await updateAlert(alert.id, { tp_hits: newTPHits });
      
      toast("Take profit hit recorded successfully");
    } catch (error) {
      console.error('handleTakeProfitHit error:', error);
      toast("Failed to record take profit hit");
    } finally {
      setUpdatesInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(alert.id);
        return newSet;
      });
    }
  }, [updateAlert]);

  const handleStopLossHit = useCallback(async (alert: TradeAlertWithProfile) => {
    try {
      setUpdatesInProgress(prev => new Set(prev).add(alert.id));
      
      await updateAlert(alert.id, { 
        status: 'closed',
        close_reason: 'stop_loss'
      });
      
      toast("Stop loss hit - signal closed");
    } catch (error) {
      console.error('handleStopLossHit error:', error);
      toast("Failed to close signal on stop loss");
    } finally {
      setUpdatesInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(alert.id);
        return newSet;
      });
    }
  }, [updateAlert]);

  const handleActivateOrder = useCallback(async (alert: TradeAlertWithProfile) => {
    try {
      setUpdatesInProgress(prev => new Set(prev).add(alert.id));
      
      await updateAlert(alert.id, { status: 'active' });
      
      toast("Order activated successfully");
    } catch (error) {
      console.error('handleActivateOrder error:', error);
      toast("Failed to activate order");
    } finally {
      setUpdatesInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(alert.id);
        return newSet;
      });
    }
  }, [updateAlert]);

  // WebSocket price integration
  const symbols = useMemo(() => {
    const symbolSet = new Set<string>();
    
    // Add active alert symbols
    activeAlerts.forEach(alert => {
      if (alert.tradermadeSymbol) {
        symbolSet.add(alert.tradermadeSymbol);
      }
    });

    // Add recent closed alert symbols (for display purposes)
    staticClosedAlerts.slice(0, 6).forEach(alert => {
      if (alert.tradermadeSymbol) {
        symbolSet.add(alert.tradermadeSymbol);
      }
    });

    const symbolsArray = Array.from(symbolSet);
    console.log('symbols - WebSocket subscription symbols:', symbolsArray);
    return symbolsArray;
  }, [activeAlerts, staticClosedAlerts]);

  const { 
    prices: rawPrices, 
    isConnected: pricesConnected,
    subscribe: subscribeToPrice, 
    unsubscribe: unsubscribeFromPrice 
  } = useOptimizedWebSocketPrices();

  const symbolPrices = useMemo(() => {
    const processedPrices: Record<string, { price: number; timestamp: number }> = {};
    
    Object.entries(rawPrices).forEach(([symbol, priceData]) => {
      if (priceData && typeof priceData === 'object' && 'price' in priceData) {
        processedPrices[symbol] = {
          price: Number(priceData.price) || 0,
          timestamp: Date.now()
        };
      }
    });

    return processedPrices;
  }, [rawPrices]);

  // Subscribe to price updates for relevant symbols
  useEffect(() => {
    console.log('useEffect - Managing price subscriptions for symbols:', symbols);
    
    if (symbols.length > 0) {
      symbols.forEach(symbol => {
        subscribeToPrice(symbol);
      });
    }

    return () => {
      symbols.forEach(symbol => {
        unsubscribeFromPrice(symbol);
      });
    };
  }, [symbols, subscribeToPrice, unsubscribeFromPrice]);

  const isLoading = false;
  const error = null;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background p-4">
        {/* Header Section */}
        <div className="max-w-7xl mx-auto space-y-6">
          <SignalStreamHeader 
            signalCounts={signalCounts}
            canCreateSignals={canCreateSignals}
            onCreateSignal={() => setShowNewAlertModal(true)}
            connectionStatus={connectionStatus}
            onRefresh={() => fetchClosedAlerts()}
            lastUpdated={lastUpdated}
          />

          {/* Filters and Connection Status */}
          <div className="flex items-center justify-between">
          <EnhancedSignalFilters
            filters={filters}
            onFiltersChange={(newFilters: FilterState) => setFilters(newFilters)}
            educatorOptions={educatorOptions}
            signalCounts={signalCounts}
          />
            <ConnectionStatusIndicator 
              connectionStatus={connectionStatus}
              priceConnectionStatus={pricesConnected ? 'connected' : 'disconnected'}
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
                        livePrice={symbolPrices[alert.tradermadeSymbol]?.price}
                        onStatusUpdate={handleStatusUpdate}
                        onTakeProfitHit={handleTakeProfitHit}
                        onStopLossHit={handleStopLossHit}
                        onActivateOrder={handleActivateOrder}
                        updatesInProgress={updatesInProgress}
                        isAdmin={isAdmin}
        isCreator={alert.userId === user?.id}
                        connectionStatus={connectionStatus}
                        priceSource="websocket"
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
                    <p className="text-muted-foreground">No closed signals</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {staticClosedAlerts.map((alert) => (
                      <TradeAlertCard 
                        key={`closed-${alert.id}`}
                        alert={alert}
                        livePrice={symbolPrices[alert.tradermadeSymbol]?.price}
                        onStatusUpdate={handleStatusUpdate}
                        onTakeProfitHit={handleTakeProfitHit}
                        onStopLossHit={handleStopLossHit}
                        onActivateOrder={handleActivateOrder}
                        updatesInProgress={updatesInProgress}
                        isRecentClosure={true}
                        isAdmin={isAdmin}
                        isCreator={alert.userId === user?.id}
                        connectionStatus={connectionStatus}
                        priceSource="websocket"
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

        {/* New Alert Modal */}
        {showNewAlertModal && (
          <OptimizedNewAlertForm 
            onSubmit={handleCreateSignal}
            onCancel={() => setShowNewAlertModal(false)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default SignalStream;