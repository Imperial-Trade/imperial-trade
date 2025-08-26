import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOptimizedTrading } from '@/hooks/useOptimizedTrading';
import { UpdateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { Loader2, AlertTriangle, Wifi, WifiOff, Shield, Plus, RefreshCw } from 'lucide-react';
import TradeAlertCard from '@/components/signals/TradeAlertCard';
import NotificationSystem from '@/components/notifications/NotificationSystem';
import EconomicSidebar from '@/components/widgets/EconomicSidebar';
import { useWebSocketPrices } from '@/contexts/WebSocketPriceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SignalStreamFilters } from '@/components/signals/SignalStreamFilters';
import { SignalStreamStatus } from '@/components/signals/SignalStreamStatus';
import { SignalStreamErrorBoundary } from '@/components/signals/SignalStreamErrorBoundary';
import { SignalStreamLoading } from '@/components/signals/SignalStreamLoading';
import { useConnectionHealth } from '@/hooks/useConnectionHealth';

interface PriceData {
  price: number;
  timestamp?: number;
}

export default function SignalStream() {
  console.log('🚀 SignalStream - Component starting to render');
  
  // Connection health monitoring
  const connectionHealth = useConnectionHealth('https://kmuoqkcxguafxulqlbmi.supabase.co/rest/v1/', 30000);
  
  // Debug state for tracking initialization
  const [initStage, setInitStage] = useState<'auth' | 'contexts' | 'data' | 'complete'>('auth');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  
  const addDebugInfo = useCallback((info: string) => {
    console.log(`📋 SignalStream Debug: ${info}`);
    setDebugInfo(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${info}`]);
  }, []);

  // Authentication with comprehensive error handling
  let authData;
  try {
    addDebugInfo('Initializing authentication context');
    authData = useAuth();
    console.log('✅ SignalStream - Auth context loaded:', {
      hasUser: !!authData.user,
      hasProfile: !!authData.profile,
      loading: authData.loading,
      profileLoading: authData.profileLoading
    });
  } catch (error) {
    const errorMsg = `Auth context failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error('❌ SignalStream - Auth context failed:', error);
    addDebugInfo(errorMsg);
    setLastError(errorMsg);
    
    // Return fallback component for auth failures
    return (
      <SignalStreamErrorBoundary>
        <SignalStreamLoading 
          stage="auth" 
          message="Authentication service unavailable"
          progress={0}
        />
      </SignalStreamErrorBoundary>
    );
  }

  const { user, profile, loading: authLoading, profileLoading } = authData;
  const navigate = useNavigate();

  // Update init stage based on auth status (prevent infinite re-renders)
  useEffect(() => {
    if (authLoading) {
      if (initStage !== 'auth') {
        setInitStage('auth');
        addDebugInfo('Waiting for authentication');
      }
    } else if (user && !profileLoading) {
      if (initStage !== 'contexts') {
        setInitStage('contexts');
        addDebugInfo('Authentication complete, initializing contexts');
      }
    }
  }, [authLoading, profileLoading, user, initStage, addDebugInfo]);

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    tradeType: '',
    educator: ''
  });

  // WebSocket context with comprehensive error handling
  let webSocketData;
  try {
    addDebugInfo('Initializing WebSocket context');
    webSocketData = useWebSocketPrices();
    console.log('✅ SignalStream - WebSocket context loaded:', {
      connectionStatus: webSocketData.connectionStatus,
      dataSource: webSocketData.dataSource,
      pricesCount: Object.keys(webSocketData.prices || {}).length
    });
  } catch (error) {
    const errorMsg = `WebSocket context failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error('❌ SignalStream - WebSocket context failed:', error);
    addDebugInfo(errorMsg);
    setLastError(errorMsg);
    
    // Provide fallback WebSocket data
    webSocketData = {
      prices: {},
      connectionStatus: 'error' as const,
      dataSource: 'unavailable' as const,
      lastUpdated: null,
      errors: {},
      priceUpdateSources: {},
      subscribe: () => console.warn('WebSocket unavailable - subscribe'),
      unsubscribe: () => console.warn('WebSocket unavailable - unsubscribe'),
      getPrice: () => null,
      refreshPrice: () => console.warn('WebSocket unavailable - refreshPrice')
    };
  }

  // Trading context with comprehensive error handling
  let tradingData;
  try {
    addDebugInfo('Initializing trading context');
    tradingData = useOptimizedTrading(user?.id || '', true);
    console.log('✅ SignalStream - Trading context loaded:', {
      alertsCount: tradingData.alerts?.length || 0,
      isLoading: tradingData.isLoading,
      connectionStatus: tradingData.connectionStatus,
      hasError: !!tradingData.error
    });
  } catch (error) {
    const errorMsg = `Trading context failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error('❌ SignalStream - Trading context failed:', error);
    addDebugInfo(errorMsg);
    setLastError(errorMsg);
    
    // This is critical - return error state
    return (
      <SignalStreamErrorBoundary>
        <SignalStreamLoading 
          stage="data" 
          message="Trading service unavailable - please refresh"
          progress={75}
        />
      </SignalStreamErrorBoundary>
    );
  }

  const {
    alerts: allAlerts,
    isLoading,
    error,
    updateAlert,
    refreshAlerts,
    connectionStatus,
    lastUpdated,
    nextRetryAt
  } = tradingData;

  const {
    prices: livePricesData,
    connectionStatus: priceConnectionStatus,
    dataSource: priceSource,
    subscribe,
    unsubscribe,
    getPrice
  } = webSocketData;

  // Update init stage based on data loading (prevent infinite loops)
  useEffect(() => {
    if (initStage === 'contexts' && !isLoading) {
      setInitStage('data');
      addDebugInfo('Contexts initialized, loading data');
    } else if (initStage === 'data' && allAlerts !== undefined) {
      setInitStage('complete');
      addDebugInfo(`Data loaded successfully: ${allAlerts.length} alerts`);
      setLastError(null); // Clear any previous errors
    }
  }, [initStage, isLoading, allAlerts, addDebugInfo]);

  // Show loading state during initialization
  if (authLoading || profileLoading || initStage !== 'complete') {
    const progress = initStage === 'auth' ? 25 : initStage === 'contexts' ? 50 : initStage === 'data' ? 75 : 100;
    const message = lastError || debugInfo[debugInfo.length - 1] || 'Initializing...';
    
    return (
      <SignalStreamErrorBoundary>
        <SignalStreamLoading 
          stage={initStage} 
          message={message}
          progress={progress}
        />
      </SignalStreamErrorBoundary>
    );
  }

  // Helper functions for role checking
  const isAdmin = useMemo(() => {
    const result = profile?.access_level === 'admin' || profile?.role === 'admin';
    console.log('🔐 SignalStream - Admin check:', { profile, isAdmin: result });
    return result;
  }, [profile]);

  const isEducator = useMemo(() => {
    const result = profile?.user_type === 'educator' || profile?.access_level === 'moderator' || profile?.role === 'educator';
    console.log('🎓 SignalStream - Educator check:', { profile, isEducator: result });
    return result;
  }, [profile]);

  const canCreateSignals = useMemo(() => {
    const canCreate = isAdmin || isEducator;
    console.log('✏️ SignalStream - canCreateSignals check:', {
      profile,
      isAdmin,
      isEducator,
      canCreate,
      access_level: profile?.access_level,
      role: profile?.role,
      user_type: profile?.user_type
    });
    return canCreate;
  }, [isAdmin, isEducator, profile]);

  const isCreator = useCallback((alertCreatorId: string) => {
    const result = profile?.id === alertCreatorId;
    console.log('👤 SignalStream - Creator check:', { profileId: profile?.id, alertCreatorId, isCreator: result });
    return result;
  }, [profile?.id]);

  // Apply user filters directly to all alerts (filtering is done in SignalRealtimeContext)
  const alerts = useMemo(() => {
    console.log('🔍 SignalStream - Processing alerts:', allAlerts?.length || 0);
    
    if (!allAlerts || allAlerts.length === 0) {
      console.log('📭 SignalStream - No alerts to process');
      return [];
    }
    
    console.log('📊 SignalStream - All alerts with creators:', allAlerts.map(a => ({
      id: a.id,
      asset: a.assetName,
      creator: a.creator?.display_name,
      creatorId: a.creator?.id,
      role: a.creator?.role,
      userType: a.creator?.user_type,
      accessLevel: a.creator?.access_level
    })));
    
    let filteredAlerts = allAlerts;

    // Apply user filters
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredAlerts = filteredAlerts.filter(alert => 
        alert.assetName.toLowerCase().includes(searchLower) || 
        alert.tradermadeSymbol.toLowerCase().includes(searchLower) || 
        alert.creator?.display_name?.toLowerCase().includes(searchLower)
      );
    }
    if (filters.status) {
      filteredAlerts = filteredAlerts.filter(alert => alert.status === filters.status);
    }
    if (filters.tradeType) {
      filteredAlerts = filteredAlerts.filter(alert => alert.tradeType.includes(filters.tradeType));
    }
    if (filters.educator) {
      filteredAlerts = filteredAlerts.filter(alert => alert.creator?.id === filters.educator);
    }
    
    console.log('✅ SignalStream - Filtered alerts:', filteredAlerts.length);
    return filteredAlerts;
  }, [allAlerts, filters]);

  const {
    activeAlerts,
    closedAlerts,
    educatorOptions,
    signalCounts
  } = useMemo(() => {
    const active = alerts.filter(a => a.status === 'active' || a.status === 'pending');
    const closed = alerts.filter(a => a.status === 'closed');

    // Get unique educators for filter dropdown
    const educatorsMap = new Map();
    allAlerts?.forEach(alert => {
      if (alert.creator && (alert.creator.user_type === 'educator' || alert.creator.access_level === 'admin' || alert.creator.role === 'admin')) {
        educatorsMap.set(alert.creator.id, {
          id: alert.creator.id,
          name: alert.creator.display_name || 'Unknown Educator'
        });
      }
    });
    const educatorsList = Array.from(educatorsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    // Calculate signal counts for filter badges
    const counts = {
      total: alerts.length,
      active: active.length,
      closed: closed.length,
      buy: alerts.filter(a => a.tradeType.includes('buy')).length,
      sell: alerts.filter(a => a.tradeType.includes('sell')).length
    };
    return {
      activeAlerts: active,
      closedAlerts: closed,
      educatorOptions: educatorsList,
      signalCounts: counts
    };
  }, [alerts, allAlerts]);

  const sortedClosedAlerts = useMemo(() => {
    return [...closedAlerts].sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()).slice(0, 12);
  }, [closedAlerts]);

  const symbols = useMemo(() => {
    const symbolSet = new Set<string>();
    activeAlerts.forEach(alert => {
      if (alert?.tradermadeSymbol?.trim()) {
        symbolSet.add(alert.tradermadeSymbol.trim());
      }
    });
    const symbolList = Array.from(symbolSet).sort();
    return symbolList;
  }, [activeAlerts]);

  // Convert price data to simple number format for compatibility
  const livePrices = useMemo(() => {
    const result: Record<string, number> = {};
    Object.entries(livePricesData).forEach(([symbol, priceData]) => {
      if (priceData && typeof priceData === 'object' && 'price' in priceData) {
        const data = priceData as PriceData;
        if (typeof data.price === 'number') {
          result[symbol] = data.price;
        }
      }
    });
    return result;
  }, [livePricesData]);

  // Stable symbol subscription to prevent thrashing
  const symbolsRef = useRef<string[]>([]);
  const subscriptionActiveRef = useRef(false);

  useEffect(() => {
    const prev = symbolsRef.current;
    const added = symbols.filter(s => !prev.includes(s));
    const removed = prev.filter(s => !symbols.includes(s));

    if (added.length > 0) {
      console.log('🔄 SignalStream - Subscribing (diff):', added);
      // Subscribe per-symbol to satisfy strict typings
      added.forEach(sym => {
        try {
          subscribe(sym);
        } catch (error) {
          console.warn(`Failed to subscribe to ${sym}:`, error);
        }
      });
      subscriptionActiveRef.current = true;
    }

    if (removed.length > 0) {
      console.log('🔄 SignalStream - Unsubscribing (diff):', removed);
      // Unsubscribe per-symbol to satisfy strict typings
      removed.forEach(sym => {
        try {
          unsubscribe(sym);
        } catch (error) {
          console.warn(`Failed to unsubscribe from ${sym}:`, error);
        }
      });
    }

    symbolsRef.current = [...symbols];

    return () => {
      if (symbolsRef.current.length > 0) {
        console.log('🔄 SignalStream - Cleanup unsubscribe all:', symbolsRef.current);
        symbolsRef.current.forEach(sym => {
          try {
            unsubscribe(sym);
          } catch (error) {
            console.warn(`Failed to cleanup unsubscribe ${sym}:`, error);
          }
        });
        symbolsRef.current = [];
        subscriptionActiveRef.current = false;
      }
    };
  }, [symbols, subscribe, unsubscribe]);

  const [updateInProgress, setUpdateInProgress] = useState(new Set<string>());
  const [reconnectIn, setReconnectIn] = useState<number | null>(null);
  const [justAddedIds, setJustAddedIds] = useState(new Set<string>());
  const prevAlertIdsRef = useRef(new Set<string>());

  useEffect(() => {
    const currentIds = new Set<string>(alerts.map(alert => alert.id));
    const previousIds = prevAlertIdsRef.current;
    
    const newlyAdded = new Set<string>();
    for (const id of currentIds) {
      if (!previousIds.has(id)) {
        newlyAdded.add(id);
      }
    }
    
    if (newlyAdded.size > 0) {
      setJustAddedIds(newlyAdded);
      const timeout = setTimeout(() => {
        setJustAddedIds(new Set<string>());
      }, 3000);
      return () => clearTimeout(timeout);
    }
    
    prevAlertIdsRef.current = currentIds;
  }, [alerts]);

  useEffect(() => {
    if (connectionStatus === 'connecting' && nextRetryAt) {
      const update = () => {
        const ms = nextRetryAt - Date.now();
        setReconnectIn(ms > 0 ? Math.ceil(ms / 1000) : 0);
      };
      update();
      const id = setInterval(update, 1000);
      return () => clearInterval(id);
    } else {
      setReconnectIn(null);
    }
  }, [connectionStatus, nextRetryAt]);

  const getConnectionStatusBadge = () => {
    // Enhanced connection status with health monitoring
    const healthStatus = connectionHealth.status;
    const isHealthy = healthStatus === 'healthy';
    
    switch (connectionStatus) {
      case 'connected':
        return <Badge className={`${isHealthy ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'}`}>
            <Wifi className="w-3 h-3 mr-1" />
            {isHealthy ? 'Live Updates' : 'Degraded Connection'}
          </Badge>;
      case 'connecting':
        return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Connecting...
          </Badge>;
      case 'error':
      case 'disconnected':
        return <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
            <WifiOff className="w-3 h-3 mr-1" />
            Offline Mode
          </Badge>;
      default:
        return null;
    }
  };

  const handleStatusUpdate = useCallback(async (alert: any, newStatus: string) => {
    if (updateInProgress.has(alert.id)) return;

    const alertIsCreator = isCreator(alert.creator?.id);
    console.log('🔄 SignalStream - handleStatusUpdate authorization check:', {
      alertId: alert.id,
      alertCreatorId: alert.creator?.id,
      currentUserId: profile?.id,
      isCreator: alertIsCreator,
      isAdmin,
      canUpdate: alertIsCreator || isAdmin
    });
    
    if (!alertIsCreator && !isAdmin) {
      console.warn('❌ SignalStream - User not authorized to update this signal');
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
      console.log(`🔄 Updating alert ${alert.id} status to ${newStatus}`);
      const updateDto: UpdateTradeAlertDto = {
        status: newStatus as 'pending' | 'active' | 'closed',
        closeReason: newStatus === 'closed' ? 'manual' : undefined
      };
      const result = await updateAlert(alert.id, updateDto);
      console.log('✅ SignalStream - Update result:', result);
      if (result && newStatus === 'closed' && (window as any).addNotification) {
        (window as any).addNotification({
          type: 'trade_closed',
          title: `🔒 Signal Closed`,
          message: `${alert.assetName} signal has been closed`
        });
      }
    } catch (err) {
      console.error("❌ Failed to update status:", err);
      if ((window as any).addNotification) {
        (window as any).addNotification({
          type: 'error',
          title: 'Update Failed',
          message: 'Could not update signal status. Please try again.'
        });
      }
    } finally {
      setUpdateInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(alert.id);
        return newSet;
      });
    }
  }, [updateInProgress, updateAlert, profile, isAdmin, isCreator]);

  const handleTakeProfitHit = useCallback(async (alert: any, newTPHits: number[], shouldAutoClose = false, closeReason: string | null = null) => {
    if (updateInProgress.has(alert.id)) return;

    const alertIsCreator = isCreator(alert.creator?.id);
    if (!alertIsCreator && !isAdmin) {
      return;
    }
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
  }, [updateInProgress, updateAlert, profile, isAdmin, isCreator]);

  const handleStopLossHit = useCallback(async (alert: any, closeReason: string) => {
    if (updateInProgress.has(alert.id)) return;

    const alertIsCreator = isCreator(alert.creator?.id);
    if (!alertIsCreator && !isAdmin) {
      return;
    }
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
  }, [updateInProgress, updateAlert, profile, isAdmin, isCreator]);

  const handleOrderActivation = useCallback(async (alert: any) => {
    if (updateInProgress.has(alert.id)) return;

    const alertIsCreator = isCreator(alert.creator?.id);
    if (!alertIsCreator && !isAdmin) {
      return;
    }
    setUpdateInProgress(prev => new Set(prev).add(alert.id));
    try {
      console.log(`Activating order for alert ${alert.id}`);
      const updateDto: UpdateTradeAlertDto = {
        status: 'active'
      };
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
  }, [updateInProgress, updateAlert, profile, isAdmin, isCreator]);

  return (
    <SignalStreamErrorBoundary>
      <div className="min-h-screen bg-background w-full">
        <NotificationSystem />
        
        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 right-4 z-50 max-w-xs">
            <details className="bg-background border rounded p-2 text-xs">
              <summary className="cursor-pointer font-semibold">Debug Info</summary>
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {debugInfo.map((info, i) => (
                  <div key={i} className="text-muted-foreground">{info}</div>
                ))}
                <div className="mt-2 pt-2 border-t">
                  <div>Health: {connectionHealth.status}</div>
                  <div>Latency: {connectionHealth.latency}ms</div>
                  <div>Failures: {connectionHealth.consecutiveFailures}</div>
                </div>
              </div>
            </details>
          </div>
        )}
        
        {/* Enhanced Header with Connection Health */}
        <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="w-full px-2 sm:px-4 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                    Xeon <span className="text-accent-green">Stream</span>
                  </h1>
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs w-fit">
                    <Shield className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span className="truncate">Educational Contributors</span>
                  </Badge>
                </div>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Educational market analysis patterns with reference pricing from verified educational contributors
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                {getConnectionStatusBadge()}
                {lastUpdated && <span className="text-xs text-muted-foreground">
                    Last update: {lastUpdated.toLocaleTimeString()}
                  </span>}
                {connectionHealth.latency && (
                  <span className="text-xs text-muted-foreground">
                    {connectionHealth.latency}ms
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content with Enhanced Error Handling */}
        <div className="w-full px-2 sm:px-4 py-3 sm:py-6">
          <div className="max-w-none w-full">
            <div className="w-full">
              {/* System Status */}
              <div data-prevent-widget-open="true">
                <SignalStreamStatus />
              </div>

              <div className="mb-6" />
              
              {/* Enhanced Filters */}
              <div data-prevent-widget-open="true">
                <SignalStreamFilters 
                  filters={filters} 
                  onFiltersChange={setFilters} 
                  educatorOptions={educatorOptions} 
                  signalCounts={signalCounts}
                  canCreateSignals={canCreateSignals}
                  onCreateSignal={() => navigate('/dashboard/new-signal')}
                />
              </div>
              
              {/* Enhanced Error State with Connection Health */}
              {(error || connectionHealth.consecutiveFailures > 3) && (
                <div className="mb-6 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                  <div className="flex items-center gap-2 text-destructive mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-semibold">
                      {connectionHealth.consecutiveFailures > 3 ? 'Network Issues Detected' : 'Connection Issue'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {error || `Connection has failed ${connectionHealth.consecutiveFailures} times. Signals may be delayed.`}
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => refreshAlerts()} 
                      size="sm" 
                      variant="outline"
                      className="border-destructive/30 text-destructive hover:bg-destructive/10"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Retry Connection
                    </Button>
                    <Button 
                      onClick={() => connectionHealth.checkHealth()} 
                      size="sm" 
                      variant="outline"
                    >
                      Test Connection
                    </Button>
                  </div>
                </div>
              )}
              
              {(isLoading || (connectionStatus !== 'connected' && allAlerts?.length === 0)) ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-lg border border-border bg-background p-4 animate-pulse">
                      <div className="h-4 w-1/3 bg-muted rounded mb-3" />
                      <div className="h-6 w-2/3 bg-muted rounded mb-4" />
                      <div className="h-24 w-full bg-muted rounded" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-accent-green mb-4 border-b border-accent-green/20 pb-2">
                      Educational Market Patterns ({activeAlerts.length})
                    </h2>
                    {activeAlerts.length > 0 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                        {activeAlerts.map(alert => (
                          <div key={alert.id} data-prevent-widget-open="true">
                            <TradeAlertCard 
                              alert={{
                                ...alert,
                                asset_name: alert.assetName,
                                tradermade_symbol: alert.tradermadeSymbol,
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
                              isAdmin={isAdmin} 
                              isCreator={isCreator(alert.creator?.id)} 
                              livePrice={livePrices[alert.tradermadeSymbol] || livePrices[alert.assetName.toUpperCase()]} 
                              connectionStatus={priceConnectionStatus as 'connecting' | 'connected' | 'error'} 
                              priceSource={priceSource} 
                              isRecentClosure={false} 
                              creator={alert.creator} 
                              justAdded={justAddedIds.has(alert.id)}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                          <Shield className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">No Active Educational Patterns</h3>
                        <p className="text-muted-foreground">New educational analysis patterns will appear here when posted by educational contributors.</p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h2 className="text-xl font-semibold text-muted-foreground mb-4 border-b border-border pb-2">
                      Recent Educational Analysis ({closedAlerts.length})
                    </h2>
                    {sortedClosedAlerts.length > 0 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                        {sortedClosedAlerts.map(alert => (
                          <div key={alert.id} data-prevent-widget-open="true">
                            <TradeAlertCard 
                              alert={{
                                ...alert,
                                asset_name: alert.assetName,
                                tradermade_symbol: alert.tradermadeSymbol,
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
                              isAdmin={isAdmin} 
                              isCreator={isCreator(alert.creator?.id)} 
                              livePrice={undefined} 
                              connectionStatus={priceConnectionStatus as 'connecting' | 'connected' | 'error'} 
                              priceSource={priceSource} 
                              isRecentClosure={true} 
                              creator={alert.creator} 
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                          <div className="w-8 h-8 text-muted-foreground/50">🔒</div>
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">No Completed Analysis</h3>
                        <p className="text-muted-foreground">Completed educational analysis will be shown here for reference and learning.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Economic Sidebar */}
            <div data-prevent-widget-open="true">
              <EconomicSidebar />
            </div>
          </div>
        </div>
      </div>
    </SignalStreamErrorBoundary>
  );
}
