import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSafeNavigation } from '@/hooks/useSafeNavigation';
import { useOptimizedTrading } from '@/hooks/useOptimizedTrading';
import { UpdateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { Loader2, AlertTriangle, Wifi, WifiOff, Shield, Plus } from 'lucide-react';
import TradeAlertCard from '@/components/signals/TradeAlertCard';
import NotificationSystem from '@/components/notifications/NotificationSystem';
import EconomicSidebar from '@/components/widgets/EconomicSidebar';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SignalStreamFilters } from '@/components/signals/SignalStreamFilters';

import StreamErrorBoundary from '@/components/signals/StreamErrorBoundary';
import { GlobalLeadershipBanner } from '@/components/dev/GlobalLeadershipBanner';
import { isDevToolsEnabled } from '@/utils/featureFlags';


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

  // Use the optimized trading hook with real-time updates for all signals
  // Pass the actual user ID for proper authorization, even when showing all signals
  const {
    alerts: allAlerts,
    isLoading,
    error,
    updateAlert,
    createAlert,
    refreshAlerts,
    connectionStatus,
    lastUpdated,
    nextRetryAt
  } = useOptimizedTrading(user?.id || '', true); // Pass user ID instead of empty string

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
  const sortedClosedAlerts = useMemo(() => {
    return [...closedAlerts].sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()).slice(0, 12);
  }, [closedAlerts]);

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
  const symbols = useMemo(() => {
    const symbolSet = new Set<string>();
    
    // Subscribe to symbols from both active AND pending alerts
    [...activeAlerts, ...alerts.filter(a => a.status === 'pending')].forEach(alert => {
      if (alert?.tradermadeSymbol?.trim()) {
        symbolSet.add(alert.tradermadeSymbol.trim());
      }
    });
    
    // If no symbols found, subscribe to ONLY essential symbols to prevent message explosion
    if (symbolSet.size === 0) {
      ['XAUUSD', 'BTCUSD'].forEach(symbol => { // ✅ RESTRICTED to only essential symbols
        symbolSet.add(symbol);
      });
      if (isDevToolsEnabled()) {
        console.log('🔄 SignalStream - No alert symbols found, using essential symbols only: XAUUSD, BTCUSD');
      }
    }
    
    const symbolList = Array.from(symbolSet).sort(); // Sort for consistent comparison
    if (isDevToolsEnabled()) {
      console.log('🔄 SignalStream - Symbols to subscribe:', symbolList);
    }
    return symbolList;
  }, [activeAlerts, alerts]);
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

  // Remove page-level price subscription - let each LivePriceWidget manage its own subscription
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

    // Check if user can edit this signal (creator or admin only)
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

    // Check if user can edit this signal (creator or admin only)
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
    <StreamErrorBoundary>
      <div className="min-h-screen bg-background w-full">
        <GlobalLeadershipBanner />
        <NotificationSystem />
        
        {/* Header - Mobile Optimized spacing */}
        <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="w-full px-2 sm:px-4 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="min-w-0 flex-1">
                
                <p className="text-sm sm:text-base text-muted-foreground hidden">
                  Educational market analysis patterns with reference pricing from verified educational contributors
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 hidden">
                {getConnectionStatusBadge()}
                {lastUpdated && <span className="text-xs text-muted-foreground">
                    Last update: {lastUpdated.toLocaleTimeString()}
                  </span>}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Mobile Optimized grid layout with granular protection */}
        <div className="w-full px-2 sm:px-4 py-3 sm:py-6">
          <div className="max-w-none w-full">
            <div className="w-full">
              
              {/* System Status - Removed for clean UI */}
              
              



              <div className="mb-6" />
              
              {/* Enhanced Filters - Protected from widget opening */}
              <div data-prevent-widget-open="true">
                <SignalStreamFilters filters={filters} onFiltersChange={setFilters} educatorOptions={educatorOptions} signalCounts={signalCounts} canCreateSignals={canCreateSignals} onCreateSignal={() => setShowCreateModal(true)} />
              </div>
              
              {isLoading || connectionStatus !== 'connected' && allAlerts.length === 0 ? <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                  {Array.from({
                length: 6
              }).map((_, i) => <div key={i} className="rounded-lg border border-border bg-background p-4 animate-pulse">
                      <div className="h-4 w-1/3 bg-muted rounded mb-3" />
                      <div className="h-6 w-2/3 bg-muted rounded mb-4" />
                      <div className="h-24 w-full bg-muted rounded" />
                    </div>)}
                </div> : <div className="space-y-5">
                  <div>
                    <h2 className="text-lg font-semibold mb-3 border-b border-accent-green/20 pb-1.5">
                      <span className="text-imperial-platinum">Active </span>
                      <span 
                        className="bg-clip-text text-transparent font-medium"
                        style={{ 
                          background: 'linear-gradient(135deg, hsl(45, 70%, 70%), hsl(45, 80%, 50%), hsl(45, 90%, 30%))',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}
                      >
                        Alerts
                      </span>
                      <span className="text-imperial-platinum"> ({activeAlerts.length})</span>
                    </h2>
                    {activeAlerts.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {activeAlerts.map(alert => <div key={alert.id} data-prevent-widget-open="true">
                            <TradeAlertCard alert={{
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
                    }} onStatusUpdate={handleStatusUpdate} onTakeProfitHit={handleTakeProfitHit} onStopLossHit={handleStopLossHit} onOrderActivation={handleOrderActivation} isAdmin={isAdmin} isCreator={isCreator(alert.creator?.id)} livePrice={livePrices[alert.tradermadeSymbol] || livePrices[alert.assetName.toUpperCase()]} connectionStatus={priceConnectionStatus as 'connecting' | 'connected' | 'error'} priceSource={priceSource} isRecentClosure={false} creator={alert.creator} justAdded={justAddedIds.has(alert.id)} />
                          </div>)}
                      </div> : <div className="text-center py-8">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                          <Shield className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">No Active Educational Patterns</h3>
                        <p className="text-muted-foreground">New educational analysis patterns will appear here when posted by educational contributors.</p>
                      </div>}
                  </div>
                  
                  <div>
                    <h2 className="text-lg font-semibold mb-3 border-b border-border pb-1.5">
                      <span className="text-imperial-platinum">Closed </span>
                      <span 
                        className="bg-clip-text text-transparent font-medium"
                        style={{ 
                          background: 'linear-gradient(135deg, hsl(45, 70%, 70%), hsl(45, 80%, 50%), hsl(45, 90%, 30%))',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}
                      >
                        Alerts
                      </span>
                      <span className="text-imperial-platinum"> ({closedAlerts.length})</span>
                    </h2>
                    {sortedClosedAlerts.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {sortedClosedAlerts.map(alert => <div key={alert.id} data-prevent-widget-open="true">
                            <TradeAlertCard alert={{
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
                    }} onStatusUpdate={handleStatusUpdate} onTakeProfitHit={handleTakeProfitHit} onStopLossHit={handleStopLossHit} onOrderActivation={handleOrderActivation} isAdmin={isAdmin} isCreator={isCreator(alert.creator?.id)} livePrice={undefined} connectionStatus={priceConnectionStatus as 'connecting' | 'connected' | 'error'} priceSource={priceSource} isRecentClosure={true} creator={alert.creator} />
                          </div>)}
                      </div> : <div className="text-center py-8">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                          <div className="w-8 h-8 text-muted-foreground/50">🔒</div>
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">No Completed Analysis</h3>
                        <p className="text-muted-foreground">Completed educational analysis will be shown here for reference and learning.</p>
                      </div>}
                  </div>
                </div>}
            </div>

            {/* Economic Sidebar - Protected positioning */}
            <div data-prevent-widget-open="true">
              <EconomicSidebar />
            </div>
          </div>
        </div>
        
        {/* Create Signal Modal */}
         <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-lg border border-violet-500/20 shadow-2xl shadow-violet-500/10">
              <DialogHeader>
                <DialogTitle className="text-white text-xl font-semibold">Create Alert</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Create a new educational trading pattern for learning and analysis purposes.
                </p>
              </DialogHeader>
             <OptimizedNewAlertForm 
               onSubmit={handleCreateSignal}
               onCancel={() => setShowCreateModal(false)}
             />
           </DialogContent>
         </Dialog>
      </div>
    </StreamErrorBoundary>
  );
}