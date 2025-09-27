import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSafeNavigation } from '@/hooks/useSafeNavigation';
import { useSignalRealtime } from '@/hooks/useSignalRealtime';
import { tradingApiService, TradeAlertWithProfile } from '@/api/services/TradingApiService';
import { UpdateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { Loader2, AlertTriangle, Wifi, WifiOff, Shield, Plus } from 'lucide-react';
import TradeAlertCard from '@/components/signals/TradeAlertCard';
import InAppNotificationSystem from '@/components/notifications/InAppNotificationSystem';
import EconomicSidebar from '@/components/widgets/EconomicSidebar';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SignalStreamFilters } from '@/components/signals/SignalStreamFilters';

import StreamErrorBoundary from '@/components/signals/StreamErrorBoundary';
import { GlobalLeadershipBanner } from '@/components/dev/GlobalLeadershipBanner';
import { isDevToolsEnabled } from '@/utils/featureFlags';
import { useUIActivityRegistration } from '@/hooks/useUIActivityRegistration';
import { useThrottledOrderMonitor } from '@/hooks/useThrottledOrderMonitor';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import OptimizedNewAlertForm from '@/components/signals/OptimizedNewAlertForm';
import { useToast } from '@/hooks/use-toast';
import { CreateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import type { TradeAlertSubmissionData } from '@/hooks/useOptimizedTradeAlertForm';

export default function SignalStream() {
  const {
    user,
    profile
  } = useAuth();
  const { navigate, isNavigationAvailable, navigationError } = useSafeNavigation();
  const { toast } = useToast();
  
  // State for filtering and modal
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    tradeType: '',
    educator: ''
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // 🔒 Anti-flicker: hydrate once, then never show skeleton again
  const hasHydratedRef = useRef(false);

  // 🚀 DIRECT REALTIME: Use useSignalRealtime directly to eliminate subscription chain storm
  const {
    alerts: allAlerts,
    isLoading: realtimeLoading,
    error: realtimeError,
    connectionStatus,
    lastUpdated,
    nextRetryAt,
    updateAlert,
    refreshAlerts
  } = useSignalRealtime(user?.id || '', true);
  
  useEffect(() => {
    if (!hasHydratedRef.current && (allAlerts.length > 0 || connectionStatus === 'connected' || lastUpdated)) {
      hasHydratedRef.current = true;
    }
  }, [allAlerts.length, connectionStatus, lastUpdated]);
  
  // Local state for operations
  const isLoading = realtimeLoading;
  const error = realtimeError;
  
  // 🚀 CREATE ALERT: Direct API call with optimistic updates
  const createAlert = useCallback(async (dto: any) => {
    try {
      const result = await tradingApiService.createAlert(dto, user?.id || '');
      if (result.success) {
        await refreshAlerts();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to create alert:', err);
      return false;
    }
  }, [refreshAlerts, user?.id]);

  // Helper functions for role checking
  const isAdmin = useMemo(() => {
    return profile?.access_level === 'admin' || profile?.role === 'admin';
  }, [profile]);
  const isEducator = useMemo(() => {
    return profile?.user_type === 'educator' || profile?.access_level === 'moderator' || profile?.role === 'educator';
  }, [profile]);
  const canCreateSignals = useMemo(() => {
    const canCreate = isAdmin || isEducator;
    if (isDevToolsEnabled()) {
      console.log('SignalStream - canCreateSignals check:', {
        profile,
        isAdmin,
        isEducator,
        canCreate,
        access_level: profile?.access_level,
        role: profile?.role,
        user_type: profile?.user_type
      });
    }
    return canCreate;
  }, [isAdmin, isEducator, profile]);
  const isCreator = useCallback((alertCreatorId: string) => {
    return profile?.id === alertCreatorId;
  }, [profile?.id]);

  // Apply user filters directly to all alerts (filtering is done in SignalRealtimeContext)
  const alerts = useMemo(() => {
    if (isDevToolsEnabled()) {
      console.log('SignalStream - Processing alerts:', allAlerts.length);
      console.log('SignalStream - All alerts with creators:', allAlerts.map(a => ({
        id: a.id,
        asset: a.assetName,
        creator: a.creator?.display_name,
        creatorId: a.creator?.id,
        role: a.creator?.role,
        userType: a.creator?.user_type,
        accessLevel: a.creator?.access_level
      })));
    }
    let filteredAlerts = allAlerts;

    // Apply user filters
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredAlerts = filteredAlerts.filter(alert => alert.assetName.toLowerCase().includes(searchLower) || alert.tradermadeSymbol.toLowerCase().includes(searchLower) || alert.creator?.display_name?.toLowerCase().includes(searchLower));
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
    return filteredAlerts;
  }, [allAlerts, filters]);
  
  const {
    activeAlerts,
    closedAlerts,
    educatorOptions,
    signalCounts
  } = useMemo(() => {
    const active = alerts.filter(a => a.status === 'active' || a.status === 'pending' || a.status === 'partially_profited');
    const closed = alerts.filter(a => a.status === 'closed');

    // Get unique educators for filter dropdown
    const educatorsMap = new Map();
    allAlerts.forEach(alert => {
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

  // PHASE 4: Static closed alerts - fetch once on page load, no real-time updates
  const [staticClosedAlerts, setStaticClosedAlerts] = useState<TradeAlertWithProfile[]>([]);
  const [closedAlertsCount, setClosedAlertsCount] = useState<number>(0);
  const [closedAlertsLoaded, setClosedAlertsLoaded] = useState(false);

  // PHASE 4: Fetch static closed alerts on component mount
  useEffect(() => {
    const fetchClosedAlerts = async () => {
      if (closedAlertsLoaded || !user?.id) return;
      
      try {
        const { data: closedAlertsData, error } = await supabase
          .from('trade_alerts')
          .select('*')
          .eq('status', 'closed')
          .in('user_id', allAlerts.map(a => a.userId as string).filter((id, index, arr) => arr.indexOf(id) === index))
          .order('updated_at', { ascending: false })
          .limit(12);

        if (error) {
          console.error('Error fetching closed alerts:', error);
          return;
        }

        // Get total count of closed signals
        const { count } = await supabase
          .from('trade_alerts')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'closed')
          .in('user_id', allAlerts.map(a => a.userId as string).filter((id, index, arr) => arr.indexOf(id) === index));

        const formattedClosedAlerts: TradeAlertWithProfile[] = (closedAlertsData || []).map(alert => ({
          id: alert.id,
          userId: alert.user_id,
          assetName: alert.asset_name,
          tradermadeSymbol: alert.tradermade_symbol,
          tradeType: alert.trade_type,
          entryPrice: Number(alert.entry_price),
          stopLoss: Number(alert.stop_loss),
          status: alert.status,
          tp1: alert.tp1 ? Number(alert.tp1) : undefined,
          tp2: alert.tp2 ? Number(alert.tp2) : undefined,
          tp3: alert.tp3 ? Number(alert.tp3) : undefined,
          tp4: alert.tp4 ? Number(alert.tp4) : undefined,
          tp5: alert.tp5 ? Number(alert.tp5) : undefined,
          tpHits: alert.tp_hits || [],
          notes: alert.notes,
          closeReason: alert.close_reason,
          createdAt: alert.created_at,
          updatedAt: alert.updated_at,
          creator: undefined
        }));

        setStaticClosedAlerts(formattedClosedAlerts);
        setClosedAlertsCount(count || 0);
        setClosedAlertsLoaded(true);
      } catch (error) {
        console.error('Error in fetchClosedAlerts:', error);
      }
    };

    fetchClosedAlerts();
  }, [allAlerts, user?.id, closedAlertsLoaded]);

  // Check if we have pending limit orders for the monitor
  const hasPendingLimitOrders = useMemo(() => {
    return activeAlerts.some(alert => alert.status === 'pending' && (alert.tradeType === 'buy_limit' || alert.tradeType === 'sell_limit'));
  }, [activeAlerts]);

  // Throttled Order Monitor - only run for admin/educator users with pending limits
  const {
    isRunning: isMonitorRunning
  } = useThrottledOrderMonitor({
    enabled: canCreateSignals,
    // Only enabled for admin/educator users
    hasPendingLimits: hasPendingLimitOrders,
    intervalMs: 15000 // 15 seconds
  });
  
  // Define symbols first for UI activity registration
  const symbols = useMemo(() => {
    const symbolSet = new Set<string>();
    
    // Subscribe to symbols from both active AND pending alerts (normalized)
    [...activeAlerts, ...alerts.filter(a => a.status === 'pending')].forEach(alert => {
      if (alert?.tradermadeSymbol?.trim()) {
        symbolSet.add(alert.tradermadeSymbol.trim().toUpperCase());
      }
    });
    
    // If no symbols found, subscribe to essential symbols for warm-start
    if (symbolSet.size === 0) {
      ['XAUUSD', 'BTCUSD'].forEach(symbol => {
        symbolSet.add(symbol);
      });
      if (isDevToolsEnabled()) {
        console.log('🔄 SignalStream - No alert symbols found, using essential symbols: XAUUSD, BTCUSD');
      }
    }
    
    // Limit to top 2 symbols for efficient connection management
    const symbolList = Array.from(symbolSet).sort().slice(0, 2);
    if (isDevToolsEnabled()) {
      console.log('🔄 SignalStream - Pre-subscribing to top 2 symbols:', symbolList);  
    }
    return symbolList;
  }, [activeAlerts, alerts]);

  // 🎯 CRITICAL: Register UI activity to enable price ingestor processing
  const { registerInteraction } = useUIActivityRegistration(symbols);

  const {
    prices: livePricesData,
    connectionStatus: priceConnectionStatus,
    dataSource: priceSource,
    subscribe,
    unsubscribe,
    getPrice
  } = useOptimizedWebSocketPrices();

  // Convert price data to simple number format for compatibility
  const livePrices = useMemo(() => {
    const result: Record<string, number> = {};
    Object.entries(livePricesData).forEach(([symbol, priceData]) => {
      if (priceData && typeof priceData.price === 'number') {
        result[symbol] = priceData.price;
      }
    });
    return result;
  }, [livePricesData]);

  // Pre-subscribe to warm up the connection for the most important symbols
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (symbols.length > 0) {
        subscribe(symbols);
        if (isDevToolsEnabled()) {
          console.log('🚀 SignalStream - Pre-warming connection with symbols:', symbols);
        }
      }
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(timeoutId);
      if (symbols.length > 0) {
        unsubscribe(symbols);
      }
    };
  }, [symbols, subscribe, unsubscribe]);
  
  // Handle creating new signal
  const handleCreateSignal = async (data: TradeAlertSubmissionData) => {
    if (!user?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create educational patterns.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Convert form data to CreateTradeAlertDto
      const createDto: CreateTradeAlertDto = {
        assetName: data.asset_name,
        tradermadeSymbol: data.tradermade_symbol,
        tradeType: data.trade_type,
        entryPrice: data.entry_price,
        stopLoss: data.stop_loss,
        tp1: data.tp1,
        tp2: data.tp2,
        tp3: data.tp3,
        tp4: data.tp4,
        tp5: data.tp5,
        notes: data.notes
      };

      const result = await createAlert(createDto);
      
      if (result) {
        toast({
          title: "🚀 Educational Pattern Created!",
          description: `${data.asset_name} ${data.trade_type.replace('_', ' ').toUpperCase()} educational analysis has been posted.`,
        });
        
        setShowCreateModal(false);
        // Refresh alerts will happen automatically via the query
      } else {
        throw new Error('Failed to create educational pattern');
      }
    } catch (error) {
      console.error('Error creating trade alert:', error);
      toast({
        title: "Error Creating Educational Pattern",
        description: "Failed to create educational analysis. Please check your inputs and try again.",
        variant: "destructive",
      });
    }
  };

  const [updateInProgress, setUpdateInProgress] = useState(new Set<string>());
  const [reconnectIn, setReconnectIn] = useState<number | null>(null);
  const [justAddedIds, setJustAddedIds] = useState(new Set<string>());
  const prevAlertIdsRef = useRef(new Set<string>());

  // Track newly added alerts to highlight them briefly
  useEffect(() => {
    const currentIds = new Set(alerts.map(alert => alert.id));
    const previousIds = prevAlertIdsRef.current;

    // Find newly added alerts
    const newlyAdded = new Set<string>();
    for (const id of currentIds) {
      if (!previousIds.has(id)) {
        newlyAdded.add(id);
      }
    }
    if (newlyAdded.size > 0) {
      setJustAddedIds(newlyAdded);
      // Clear the highlight after 3 seconds
      const timeout = setTimeout(() => {
        setJustAddedIds(new Set());
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
    switch (connectionStatus) {
      case 'connected':
        return <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
            <Wifi className="w-3 h-3 mr-1" />
            Live Updates
          </Badge>;
      case 'connecting':
        return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
            <Loader2 className="w-3 h-3 mr-1" style={{ willChange: 'transform', transform: 'translateZ(0)' }} />
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

    // Check if user can edit this signal (creator or admin only)
    const alertIsCreator = isCreator(alert.creator?.id);
    if (isDevToolsEnabled()) {
      console.log('SignalStream - handleStatusUpdate authorization check:', {
        alertId: alert.id,
        alertCreatorId: alert.creator?.id,
        currentUserId: profile?.id,
        isCreator: alertIsCreator,
        isAdmin,
        canUpdate: alertIsCreator || isAdmin
      });
    }
    if (!alertIsCreator && !isAdmin) {
      if (isDevToolsEnabled()) {
        console.warn('SignalStream - User not authorized to update this signal:', {
          userId: profile?.id,
          creatorId: alert.creator?.id,
          userRole: profile?.role,
          userAccessLevel: profile?.access_level,
          isCreator: alertIsCreator,
          isAdmin
        });
      }
      if ((window as any).addNotification) {
        (window as any).addNotification({
          type: 'error',
          title: 'Access Denied',
          message: 'You can only close your own signals'
        });
      }
      return;
    }
    
    // Optimistic local state: immediately mark as closed if closing
    if (newStatus === 'closed') {
      // Set local closed state to prevent duplicate processing
      alert.localClosed = true;
    }
    
    setUpdateInProgress(prev => new Set(prev).add(alert.id));
    try {
      console.log(`Updating alert ${alert.id} status to ${newStatus}`);
      const updateDto: UpdateTradeAlertDto = {
        status: newStatus as 'pending' | 'active' | 'closed',
        closeReason: newStatus === 'closed' ? 'manual' : undefined
      };
      const result = await updateAlert(alert.id, updateDto);
      console.log('SignalStream - Update result:', result);
      if (result && newStatus === 'closed' && (window as any).addNotification) {
        (window as any).addNotification({
          type: 'trade_closed',
          title: `🔒 Signal Closed`,
          message: `${alert.assetName} signal has been closed`
        });
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      // Revert optimistic update on error
      if (newStatus === 'closed') {
        alert.localClosed = false;
      }
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

    // Check if user can edit this signal (creator or admin only)
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
            typedCloseReason = undefined;
        }
      }
      const updateDto: UpdateTradeAlertDto = {
        tpHits: newTPHits,
        status: shouldAutoClose ? 'closed' : undefined,
        closeReason: typedCloseReason
      };
      await updateAlert(alert.id, updateDto);
      // Notifications are handled by real-time updates
    } catch (err) {
      console.error("Failed to update TP hits:", err);
    } finally {
      setUpdateInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(alert.id);
        return newSet;
      });
    }
  }, [updateInProgress, updateAlert, isAdmin, isCreator]);
  const handleStopLossHit = useCallback(async (alert: any) => {
    if (updateInProgress.has(alert.id)) return;

    // Check if user can edit this signal (creator or admin only)
    const alertIsCreator = isCreator(alert.creator?.id);
    if (!alertIsCreator && !isAdmin) {
      return;
    }
    setUpdateInProgress(prev => new Set(prev).add(alert.id));
    try {
      console.log(`Stop loss hit for alert ${alert.id}`);
      const updateDto: UpdateTradeAlertDto = {
        status: 'closed',
        closeReason: 'stop_loss'
      };
      await updateAlert(alert.id, updateDto);
      // Notifications are handled by real-time updates
    } catch (err) {
      console.error("Failed to update stop loss hit:", err);
    } finally {
      setUpdateInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(alert.id);
        return newSet;
      });
    }
  }, [updateInProgress, updateAlert, isAdmin, isCreator]);
  const handleOrderActivation = useCallback(async (alert: any) => {
    if (updateInProgress.has(alert.id)) return;
    
    // Check if user can edit this signal (creator or admin only)
    const alertIsCreator = isCreator(alert.creator?.id);
    if (!alertIsCreator && !isAdmin) {
      return;
    }
    setUpdateInProgress(prev => new Set(prev).add(alert.id));
    try {
      console.log(`Activating pending order for alert ${alert.id}`);
      const updateDto: UpdateTradeAlertDto = {
        status: 'active'
      };
      await updateAlert(alert.id, updateDto);
      if ((window as any).addNotification) {
        (window as any).addNotification({
          type: 'order_activated',
          title: '⚡ Order Activated',
          message: `${alert.assetName} ${alert.tradeType.replace('_', ' ')} order is now active`
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
  }, [updateInProgress, updateAlert, isAdmin, isCreator]);

  if (!isNavigationAvailable && navigationError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <h1 className="text-xl font-semibold">Navigation Error</h1>
          <p className="text-muted-foreground">{navigationError}</p>
        </div>
      </div>
    );
  }

  // Only show loading for truly initial load - avoids flicker on subsequent updates
  if (isLoading && !hasHydratedRef.current) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading educational patterns...</p>
        </div>
      </div>
    );
  }

  return (
    <StreamErrorBoundary>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 space-y-8">
          {/* Dev Tools */}
          {isDevToolsEnabled() && (
            <GlobalLeadershipBanner />
          )}
          
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Educational Patterns</h1>
              <p className="text-muted-foreground">Live market analysis and trading opportunities from our team of educators</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {getConnectionStatusBadge()}
              
              {canCreateSignals && (
                <Button 
                  onClick={() => setShowCreateModal(true)}
                  className="w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Educational Pattern
                </Button>
              )}
            </div>
          </div>

          {/* Connection Status & Monitoring Info */}
          {(isMonitorRunning || reconnectIn || error) && (
            <div className="space-y-2">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Connection Error</span>
                  </div>
                  <p className="text-sm mt-1 text-muted-foreground">{error}</p>
                  {reconnectIn && (
                    <p className="text-sm mt-1 text-muted-foreground">
                      Retrying in {reconnectIn} seconds...
                    </p>
                  )}
                </div>
              )}
              
              {isMonitorRunning && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Order Monitor Running</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Filters */}
          <SignalStreamFilters 
            filters={filters}
            onFiltersChange={setFilters}
            signalCounts={signalCounts}
            educatorOptions={educatorOptions}
          />

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Signals Stream - Takes up 3 columns */}
            <div className="lg:col-span-3 space-y-8">
              {/* Active Alerts Section */}
              {activeAlerts.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-emerald-500" />
                      <h2 className="text-xl font-bold">Active Patterns</h2>
                      <Badge variant="secondary" className="ml-2">
                        {signalCounts.active}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid gap-4">
                    {activeAlerts.map((alert) => (
                      <TradeAlertCard
                        key={alert.id}
                        alert={alert}
                        onStatusUpdate={handleStatusUpdate}
                        onTakeProfitHit={handleTakeProfitHit}
                        onStopLossHit={handleStopLossHit}
                        onOrderActivation={handleOrderActivation}
                        showCloseButton={isCreator(alert.creator?.id) || isAdmin}
                        isHighlighted={justAddedIds.has(alert.id)}
                        livePrice={livePrices[alert.tradermadeSymbol]}
                        canUpdate={isCreator(alert.creator?.id) || isAdmin}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {/* PHASE 4: Static Closed Alerts Section - No real-time updates */}
              {staticClosedAlerts.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                      <h2 className="text-xl font-bold">Recently Closed</h2>
                      <Badge variant="secondary" className="ml-2">
                        {closedAlertsCount}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid gap-4">
                    {staticClosedAlerts.map((alert) => (
                      <TradeAlertCard
                        key={alert.id}
                        alert={alert}
                        onStatusUpdate={handleStatusUpdate}
                        onTakeProfitHit={handleTakeProfitHit}
                        onStopLossHit={handleStopLossHit}
                        onOrderActivation={handleOrderActivation}
                        showCloseButton={false}
                        isHighlighted={false} // Never highlighted for static display
                        livePrice={livePrices[alert.tradermadeSymbol]}
                        canUpdate={false} // No updates allowed on closed signals
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {activeAlerts.length === 0 && staticClosedAlerts.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Educational Patterns Available</h3>
                  <p className="text-muted-foreground mb-4">
                    Our educators haven't posted any patterns yet. Check back soon!
                  </p>
                  {canCreateSignals && (
                    <Button onClick={() => setShowCreateModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Pattern
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Economic Sidebar - Takes up 1 column */}
            <div className="lg:col-span-1">
              <EconomicSidebar />
            </div>
          </div>
        </div>

        {/* Create Signal Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Educational Pattern</DialogTitle>
            </DialogHeader>
            <OptimizedNewAlertForm 
              onSubmit={handleCreateSignal}
            />
          </DialogContent>
        </Dialog>

        {/* In-App Notifications */}
        <InAppNotificationSystem />
      </div>
    </StreamErrorBoundary>
  );
}