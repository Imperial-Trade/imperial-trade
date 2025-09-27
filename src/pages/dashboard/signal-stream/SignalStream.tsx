import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeNavigation } from '@/hooks/useSafeNavigation';
import { useOptimizedTradingRealtime } from '@/hooks/useOptimizedTradingRealtime';
import { useOptimizedWebSocketPrices } from '@/hooks/useOptimizedWebSocketPrices';
import { tradingApiService, TradeAlertWithProfile } from '@/api/services/TradingApiService';
import { CreateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TradeAlertCard } from '@/components/dashboard/TradeAlertCard';
import { EconomicSidebar } from '@/components/dashboard/EconomicSidebar';
import { OptimizedNewAlertForm } from '@/components/dashboard/OptimizedNewAlertForm';
import { EnhancedSignalFilters } from '@/components/dashboard/EnhancedSignalFilters';
import { ConnectionStatusIndicator } from '@/components/dashboard/ConnectionStatusIndicator';
import { SignalStreamHeader } from '@/components/dashboard/SignalStreamHeader';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Default filter state
const defaultFilters = {
  search: '',
  status: '',
  tradeType: '',
  educator: ''
};

const SignalStream: React.FC = () => {
  const [filters, setFilters] = useState(defaultFilters);
  const [isNewAlertModalOpen, setIsNewAlertModalOpen] = useState(false);
  
  // Static closed alerts state (Phase 4: Static Closed Alerts UI)
  const [staticClosedAlerts, setStaticClosedAlerts] = useState<TradeAlertWithProfile[]>([]);
  const [closedAlertsLoaded, setClosedAlertsLoaded] = useState(false);

  // Authentication and navigation hooks
  const { user, profile } = useAuth();
  const { navigateToPage } = useSafeNavigation();
  const { toast } = useToast();

  // Real-time data with flawless signal lifecycle (Phase 1: Normalized State Management)
  const {
    alerts: allAlerts,
    isLoading,
    error,
    connectionStatus,
    lastUpdated,
    nextRetryAt,
    updateAlert,
    refreshAlerts,
    createAlert
  } = useOptimizedTradingRealtime(user?.id || '', true);

  // User role checks
  const isAdmin = useMemo(() => {
    return profile?.access_level === 'admin' || profile?.role === 'admin';
  }, [profile]);

  const isEducator = useMemo(() => {
    return profile?.user_type === 'educator' || profile?.access_level === 'moderator' || profile?.role === 'educator';
  }, [profile]);

  const canCreateSignals = useMemo(() => {
    return isAdmin || isEducator;
  }, [isAdmin, isEducator]);

  // Fetch static closed alerts on component mount (Phase 4: Static Closed Alerts UI)
  const fetchClosedAlerts = useCallback(async () => {
    if (closedAlertsLoaded) return;
    
    try {
      console.log('fetchClosedAlerts - Fetching static closed alerts');
      
      const { data: closedSignalsData, error } = await supabase
        .from('trade_alerts')
        .select(`
          *,
          profiles (
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
        const transformedClosedAlerts: TradeAlertWithProfile[] = closedSignalsData.map(signal => ({
          id: signal.id,
          userId: signal.user_id,
          assetName: signal.asset_name,
          tradermadeSymbol: signal.tradermade_symbol,
          tradeType: signal.trade_type,
          entryPrice: Number(signal.entry_price),
          stopLoss: Number(signal.stop_loss),
          status: signal.status,
          tp1: signal.tp1 ? Number(signal.tp1) : undefined,
          tp2: signal.tp2 ? Number(signal.tp2) : undefined,
          tp3: signal.tp3 ? Number(signal.tp3) : undefined,
          tp4: signal.tp4 ? Number(signal.tp4) : undefined,
          tp5: signal.tp5 ? Number(signal.tp5) : undefined,
          tpHits: signal.tp_hits || [],
          notes: signal.notes,
          closeReason: signal.close_reason,
          createdAt: signal.created_at,
          updatedAt: signal.updated_at,
          creator: signal.profiles
        }));

        setStaticClosedAlerts(transformedClosedAlerts);
        setClosedAlertsLoaded(true);
        
        console.log('fetchClosedAlerts - Successfully loaded static closed alerts:', transformedClosedAlerts.length);
      }
    } catch (err) {
      console.error('fetchClosedAlerts - Error fetching closed alerts:', err);
    }
  }, [closedAlertsLoaded]);

  // Fetch closed alerts on mount
  useEffect(() => {
    if (!closedAlertsLoaded) {
      fetchClosedAlerts();
    }
  }, [fetchClosedAlerts, closedAlertsLoaded]);

  // Filter alerts based on user inputs
  const filteredAlerts = useMemo(() => {
    let filtered = allAlerts;

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(alert => 
        alert.assetName.toLowerCase().includes(searchLower) ||
        alert.tradermadeSymbol.toLowerCase().includes(searchLower) ||
        alert.creator?.display_name?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.status) {
      filtered = filtered.filter(alert => alert.status === filters.status);
    }

    if (filters.tradeType) {
      filtered = filtered.filter(alert => alert.tradeType.includes(filters.tradeType));
    }

    if (filters.educator) {
      filtered = filtered.filter(alert => alert.creator?.id === filters.educator);
    }

    return filtered;
  }, [allAlerts, filters]);

  // Separate active and closed alerts for display
  const activeAlerts = useMemo(() => {
    return filteredAlerts.filter(alert => 
      alert.status === 'active' || alert.status === 'pending'
    );
  }, [filteredAlerts]);

  // Calculate closed alerts count using static closed alerts
  const closedAlertsCount = staticClosedAlerts.length;

  // Use static closed alerts for display (Phase 4: Static Closed Alerts UI)
  const sortedClosedAlerts = useMemo(() => {
    return staticClosedAlerts.slice(0, 12); // Limit to 12 most recent
  }, [staticClosedAlerts]);

  // Get unique educators for filter dropdown
  const educatorOptions = useMemo(() => {
    const educatorsMap = new Map();
    allAlerts.forEach(alert => {
      if (alert.creator && (
        alert.creator.user_type === 'educator' || 
        alert.creator.access_level === 'admin' || 
        alert.creator.role === 'admin'
      )) {
        educatorsMap.set(alert.creator.id, {
          id: alert.creator.id,
          name: alert.creator.display_name || 'Unknown Educator'
        });
      }
    });
    return Array.from(educatorsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allAlerts]);

  // Calculate signal counts for filter badges
  const signalCounts = useMemo(() => ({
    total: filteredAlerts.length,
    active: activeAlerts.length,
    closed: closedAlertsCount,
    buy: filteredAlerts.filter(a => a.tradeType.includes('buy')).length,
    sell: filteredAlerts.filter(a => a.tradeType.includes('sell')).length
  }), [filteredAlerts, activeAlerts, closedAlertsCount]);

  // Handle creating new trade signal
  const handleCreateSignal = async (signalData: CreateTradeAlertDto) => {
    if (!user?.id) {
      console.error('handleCreateSignal - No user ID available');
      toast({
        title: "Authentication Required",
        description: "Please log in to create trading signals.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await createAlert(signalData);
      
      if (result) {
        toast({
          title: "Signal Created Successfully",
          description: `${signalData.assetName} ${signalData.tradeType.toUpperCase()} signal has been created.`,
        });
        
        setIsNewAlertModalOpen(false);
        // Real-time updates will handle the new signal automatically
      } else {
        throw new Error('Failed to create signal');
      }
    } catch (error) {
      console.error('Error creating signal:', error);
      toast({
        title: "Error Creating Signal",
        description: "Failed to create signal. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Update operations state management
  const [updatesInProgress, setUpdatesInProgress] = useState(new Set<string>());
  
  // Handle signal status updates
  const handleStatusUpdate = useCallback(async (alertId: string, newStatus: string) => {
    if (updatesInProgress.has(alertId)) return;

    setUpdatesInProgress(prev => new Set(prev).add(alertId));
    
    try {
      const result = await updateAlert(alertId, { status: newStatus });
      
      if (result) {
        toast({
          title: "Signal Updated",
          description: `Signal status updated to ${newStatus}`,
        });
      } else {
        throw new Error('Failed to update signal status');
      }
    } catch (error) {
      console.error('Error updating signal status:', error);
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
  }, [updateAlert, updatesInProgress, toast]);

  // Handle take profit hits
  const handleTakeProfitHit = useCallback(async (alertId: string, tpLevel: number) => {
    if (updatesInProgress.has(alertId)) return;

    setUpdatesInProgress(prev => new Set(prev).add(alertId));
    
    try {
      // Find the current alert to get existing TP hits
      const currentAlert = allAlerts.find(alert => alert.id === alertId);
      if (!currentAlert) return;

      const existingTpHits = currentAlert.tpHits || [];
      const newTpHits = [...existingTpHits, tpLevel].sort((a, b) => a - b);

      const result = await updateAlert(alertId, { tpHits: newTpHits });
      
      if (result) {
        toast({
          title: "Take Profit Hit",
          description: `TP${tpLevel} has been marked as hit`,
        });
      } else {
        throw new Error('Failed to update take profit hit');
      }
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
  }, [updateAlert, updatesInProgress, allAlerts, toast]);

  // Handle stop loss hits
  const handleStopLossHit = useCallback(async (alertId: string) => {
    if (updatesInProgress.has(alertId)) return;

    setUpdatesInProgress(prev => new Set(prev).add(alertId));
    
    try {
      const result = await updateAlert(alertId, { 
        status: 'closed',
        closeReason: 'stop_loss'
      });
      
      if (result) {
        toast({
          title: "Stop Loss Hit",
          description: "Signal has been closed due to stop loss hit",
        });
      } else {
        throw new Error('Failed to update stop loss hit');
      }
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
  }, [updateAlert, updatesInProgress, toast]);

  // Handle order activation
  const handleActivateOrder = useCallback(async (alertId: string) => {
    if (updatesInProgress.has(alertId)) return;

    setUpdatesInProgress(prev => new Set(prev).add(alertId));
    
    try {
      const result = await updateAlert(alertId, { status: 'active' });
      
      if (result) {
        toast({
          title: "Order Activated",
          description: "Signal has been activated",
        });
      } else {
        throw new Error('Failed to activate order');
      }
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
  }, [updateAlert, updatesInProgress, toast]);

  // Get symbols for price subscriptions
  const symbols = useMemo(() => {
    const symbolSet = new Set<string>();
    
    // Subscribe to symbols from both active and pending alerts
    [...activeAlerts].forEach(alert => {
      if (alert?.tradermadeSymbol?.trim()) {
        symbolSet.add(alert.tradermadeSymbol.trim().toUpperCase());
      }
    });
    
    // If no symbols found, subscribe to essential symbols
    if (symbolSet.size === 0) {
      ['XAUUSD', 'BTCUSD'].forEach(symbol => {
        symbolSet.add(symbol);
      });
    }
    
    return Array.from(symbolSet).sort().slice(0, 5); // Limit to top 5 symbols
  }, [activeAlerts]);

  // WebSocket price data
  const {
    prices: livePricesData,
    connectionStatus: priceConnectionStatus,
    subscribe: subscribeToPrices,
    unsubscribe: unsubscribeFromPrices
  } = useOptimizedWebSocketPrices();

  // Convert price data to simple format
  const symbolPrices = useMemo(() => {
    const result: Record<string, { price: number }> = {};
    Object.entries(livePricesData).forEach(([symbol, priceData]) => {
      if (priceData && typeof priceData.price === 'number') {
        result[symbol] = { price: priceData.price };
      }
    });
    return result;
  }, [livePricesData]);

  // Subscribe to price updates
  useEffect(() => {
    if (symbols.length > 0) {
      subscribeToPrices(symbols);
    }

    return () => {
      if (symbols.length > 0) {
        unsubscribeFromPrices(symbols);
      }
    };
  }, [symbols, subscribeToPrices, unsubscribeFromPrices]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <SignalStreamHeader 
            connectionStatus={connectionStatus}
            lastUpdated={lastUpdated}
            signalCounts={signalCounts}
            canCreateSignals={canCreateSignals}
            onCreateSignal={() => setIsNewAlertModalOpen(true)}
            onRefresh={refreshAlerts}
          />

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Main Content */}
            <div className="xl:col-span-3 space-y-6">
              {/* Filters */}
              <EnhancedSignalFilters
                filters={filters}
                onFiltersChange={setFilters}
                educatorOptions={educatorOptions}
                signalCounts={signalCounts}
              />

              {/* Connection Status */}
              <ConnectionStatusIndicator
                connectionStatus={connectionStatus}
                priceConnectionStatus={priceConnectionStatus}
                error={error}
                lastUpdated={lastUpdated}
                nextRetryAt={nextRetryAt}
              />

              {/* Active Signals */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Active Signals ({activeAlerts.length})</h2>
                <div className="space-y-3">
                  {activeAlerts.map((alert) => (
                    <TradeAlertCard 
                      key={`active-${alert.id}`}
                      alert={alert}
                      currentPrice={symbolPrices[alert.tradermadeSymbol]?.price}
                      onStatusUpdate={() => handleStatusUpdate(alert.id, 'closed')}
                      onTakeProfitHit={(tpLevel) => handleTakeProfitHit(alert.id, tpLevel)}
                      onStopLossHit={() => handleStopLossHit(alert.id)}
                      onActivateOrder={() => handleActivateOrder(alert.id)}
                      updatesInProgress={updatesInProgress}
                    />
                  ))}
                  {activeAlerts.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="text-lg">No active signals to display</p>
                      <p className="text-sm mt-2">Active signals will appear here when educators post new analysis</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Closed Alerts Section - Using Static Data (Phase 4) */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground">Recent Closed Signals ({closedAlertsCount})</h3>
                <div className="space-y-3">
                  {sortedClosedAlerts.map((alert) => (
                    <TradeAlertCard 
                      key={`closed-${alert.id}`}
                      alert={alert}
                      currentPrice={symbolPrices[alert.tradermadeSymbol]?.price}
                      onStatusUpdate={() => handleStatusUpdate(alert.id, alert.status)}
                      onTakeProfitHit={(tpLevel) => handleTakeProfitHit(alert.id, tpLevel)}
                      onStopLossHit={() => handleStopLossHit(alert.id)}
                      onActivateOrder={() => handleActivateOrder(alert.id)}
                      updatesInProgress={updatesInProgress}
                    />
                  ))}
                  {sortedClosedAlerts.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No closed signals to display</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="xl:col-span-1">
              <EconomicSidebar />
            </div>
          </div>
        </div>

        {/* Create Signal Modal */}
        {isNewAlertModalOpen && (
          <OptimizedNewAlertForm
            open={isNewAlertModalOpen}
            onOpenChange={setIsNewAlertModalOpen}
            onSubmit={handleCreateSignal}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default SignalStream;