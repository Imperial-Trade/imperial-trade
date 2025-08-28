
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOptimizedTrading } from '@/hooks/useOptimizedTrading';
import { UpdateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { Loader2, AlertTriangle, Wifi, WifiOff, Shield, Plus, Search } from 'lucide-react';
import TradeAlertCard from '@/components/signals/TradeAlertCard';
import NotificationSystem from '@/components/notifications/NotificationSystem';
import EconomicSidebar from '@/components/widgets/EconomicSidebar';
import { useWebSocketPrices } from '@/contexts/WebSocketPriceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StreamErrorBoundary from '@/components/signals/StreamErrorBoundary';

export default function SignalStream() {
  const {
    user,
    profile,
    loading: authLoading
  } = useAuth();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/signin', { 
        state: { from: '/dashboard/signal-stream' },
        replace: true 
      });
      return;
    }
  }, [user, authLoading, navigate]);

  // Don't render anything while checking auth or if no user
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    tradeType: '',
    educator: ''
  });

  // Use the optimized trading hook with real-time updates for all signals
  const {
    alerts: allAlerts,
    isLoading,
    error,
    updateAlert,
    refreshAlerts,
    connectionStatus,
    lastUpdated,
    nextRetryAt
  } = useOptimizedTrading(user?.id || '', true);

  // Helper functions for role checking
  const isAdmin = useMemo(() => {
    return profile?.access_level === 'admin' || profile?.role === 'admin';
  }, [profile]);
  const isEducator = useMemo(() => {
    return profile?.user_type === 'educator' || profile?.access_level === 'moderator' || profile?.role === 'educator';
  }, [profile]);
  const canCreateSignals = useMemo(() => {
    const canCreate = isAdmin || isEducator;
    return canCreate;
  }, [isAdmin, isEducator, profile]);
  const isCreator = useCallback((alertCreatorId: string) => {
    return profile?.id === alertCreatorId;
  }, [profile?.id]);

  // Apply user filters directly to all alerts
  const filteredAlerts = useMemo(() => {
    let filtered = allAlerts;

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(alert => 
        alert.assetName.toLowerCase().includes(searchLower) || 
        alert.tradermadeSymbol.toLowerCase().includes(searchLower) || 
        alert.creator?.display_name?.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(alert => alert.status === filters.status);
    }

    // Apply trade type filter
    if (filters.tradeType) {
      filtered = filtered.filter(alert => alert.tradeType.includes(filters.tradeType));
    }

    // Apply educator filter
    if (filters.educator) {
      filtered = filtered.filter(alert => alert.creator?.id === filters.educator);
    }

    return filtered;
  }, [allAlerts, filters]);

  const {
    activeAlerts,
    closedAlerts,
    educatorOptions,
    signalCounts
  } = useMemo(() => {
    const active = filteredAlerts.filter(a => a.status === 'active' || a.status === 'pending');
    const closed = filteredAlerts.filter(a => a.status === 'closed');

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
      total: allAlerts.length,
      active: allAlerts.filter(a => a.status === 'active' || a.status === 'pending').length,
      closed: allAlerts.filter(a => a.status === 'closed').length,
      buy: allAlerts.filter(a => a.tradeType.includes('buy')).length,
      sell: allAlerts.filter(a => a.tradeType.includes('sell')).length
    };

    return {
      activeAlerts: active,
      closedAlerts: closed.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()),
      educatorOptions: educatorsList,
      signalCounts: counts
    };
  }, [filteredAlerts, allAlerts]);

  const symbols = useMemo(() => {
    const symbolSet = new Set<string>();
    activeAlerts.forEach(alert => {
      if (alert?.tradermadeSymbol?.trim()) {
        symbolSet.add(alert.tradermadeSymbol.trim());
      }
    });
    return Array.from(symbolSet).sort();
  }, [activeAlerts]);

  const {
    prices: livePricesData,
    connectionStatus: priceConnectionStatus,
    dataSource: priceSource,
    subscribe,
    unsubscribe
  } = useWebSocketPrices();

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

  // Stable symbol subscription
  const symbolsRef = useRef<string[]>([]);

  useEffect(() => {
    const prev = symbolsRef.current;
    const added = symbols.filter(s => !prev.includes(s));
    const removed = prev.filter(s => !symbols.includes(s));

    if (added.length > 0) {
      subscribe(added);
    }

    if (removed.length > 0) {
      unsubscribe(removed);
    }

    symbolsRef.current = [...symbols];

    return () => {
      if (symbolsRef.current.length > 0) {
        unsubscribe(symbolsRef.current);
        symbolsRef.current = [];
      }
    };
  }, [symbols, subscribe, unsubscribe]);

  const [updateInProgress, setUpdateInProgress] = useState(new Set<string>());

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

  // Handler functions for signal updates
  const handleStatusUpdate = useCallback(async (alert: any, newStatus: string) => {
    if (updateInProgress.has(alert.id)) return;

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
      const updateDto: UpdateTradeAlertDto = {
        status: newStatus as 'pending' | 'active' | 'closed' | 'partially_profited',
        closeReason: newStatus === 'closed' ? 'manual' : undefined
      };
      const result = await updateAlert(alert.id, updateDto);
      if (result && newStatus === 'closed' && (window as any).addNotification) {
        (window as any).addNotification({
          type: 'trade_closed',
          title: `🔒 Signal Closed`,
          message: `${alert.assetName} signal has been closed`
        });
      }
    } catch (err) {
      console.error("Failed to update status:", err);
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
    if (!alertIsCreator && !isAdmin) return;

    setUpdateInProgress(prev => new Set(prev).add(alert.id));
    try {
      let typedCloseReason: 'manual' | 'stop_loss' | 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'all_tps_hit' | 'reversal_after_tp' | undefined = undefined;
      if (shouldAutoClose && closeReason) {
        switch (closeReason) {
          case 'manual':
          case 'stop_loss':
          case 'tp1':
          case 'tp2':
          case 'tp3':
          case 'tp4':
          case 'tp5':
          case 'all_tps_hit':
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
    if (!alertIsCreator && !isAdmin) return;

    setUpdateInProgress(prev => new Set(prev).add(alert.id));
    try {
      let typedCloseReason: 'manual' | 'stop_loss' | 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'all_tps_hit' | 'reversal_after_tp' = 'stop_loss';
      switch (closeReason) {
        case 'manual':
        case 'stop_loss':
        case 'tp1':
        case 'tp2':
        case 'tp3':
        case 'tp4':
        case 'tp5':
        case 'all_tps_hit':
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
    if (!alertIsCreator && !isAdmin) return;

    setUpdateInProgress(prev => new Set(prev).add(alert.id));
    try {
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
        <NotificationSystem />
        
        {/* Header */}
        <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="w-full px-4 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <h1 className="text-3xl font-bold text-foreground">
                  Xeon <span className="text-accent-green">Stream</span>
                </h1>
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 w-fit">
                  <Shield className="w-3 h-3 mr-1" />
                  Educational Contributors
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                {getConnectionStatusBadge()}
                {lastUpdated && (
                  <span className="text-xs text-muted-foreground">
                    Last update: {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
            
            <p className="text-muted-foreground mt-2">
              Educational market analysis patterns with reference pricing from verified educational contributors
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="w-full px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search assets or educators..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue placeholder={`All Status (${signalCounts.total})`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status ({signalCounts.total})</SelectItem>
                <SelectItem value="active">Active ({signalCounts.active})</SelectItem>
                <SelectItem value="pending">Pending ({signalCounts.active})</SelectItem>
                <SelectItem value="closed">Closed ({signalCounts.closed})</SelectItem>
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={filters.tradeType} onValueChange={(value) => setFilters(prev => ({ ...prev, tradeType: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="buy">Buy Orders ({signalCounts.buy})</SelectItem>
                <SelectItem value="sell">Sell Orders ({signalCounts.sell})</SelectItem>
              </SelectContent>
            </Select>

            {/* Educator Filter */}
            <Select value={filters.educator} onValueChange={(value) => setFilters(prev => ({ ...prev, educator: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="All Educators" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Educators</SelectItem>
                {educatorOptions.map(educator => (
                  <SelectItem key={educator.id} value={educator.id}>
                    {educator.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Create Signal Button */}
          {canCreateSignals && (
            <div className="mb-6">
              <Button onClick={() => navigate('/dashboard/new-signal')} className="gap-2">
                <Plus className="w-4 h-4" />
                Create New Signal
              </Button>
            </div>
          )}

          {/* Main Content */}
          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border bg-background p-4 animate-pulse">
                  <div className="h-4 w-1/3 bg-muted rounded mb-3" />
                  <div className="h-6 w-2/3 bg-muted rounded mb-4" />
                  <div className="h-24 w-full bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Educational Market Patterns Section */}
              <div>
                <h2 className="text-xl font-semibold text-accent-green mb-4 border-b border-accent-green/20 pb-2">
                  Educational Market Patterns ({activeAlerts.length})
                </h2>
                {activeAlerts.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {activeAlerts.map(alert => (
                      <TradeAlertCard 
                        key={alert.id}
                        alert={{
                          ...alert,
                          asset_name: alert.assetName,
                          tradermade_symbol: alert.tradermadeSymbol,
                          trade_type: alert.tradeType,
                          entry_price: alert.entryPrice,
                          stop_loss: alert.stopLoss,
                          tp_hits: alert.tpHits,
                          close_reason: alert.closeReason as any,
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
                        creator={
                          alert.creator
                            ? {
                                id: alert.creator.id,
                                display_name: alert.creator.display_name,
                                role: alert.creator.role || alert.creator.user_type || alert.creator.access_level || 'member',
                                avatar_url: alert.creator.avatar_url,
                                user_type: alert.creator.user_type,
                                access_level: alert.creator.access_level,
                              }
                            : undefined
                        }
                      />
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
              
              {/* Recent Educational Analysis Section */}
              <div>
                <h2 className="text-xl font-semibold text-muted-foreground mb-4 border-b border-border pb-2">
                  Recent Educational Analysis ({closedAlerts.length})
                </h2>
                {closedAlerts.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {closedAlerts.slice(0, 12).map(alert => (
                      <TradeAlertCard 
                        key={alert.id}
                        alert={{
                          ...alert,
                          asset_name: alert.assetName,
                          tradermade_symbol: alert.tradermadeSymbol,
                          trade_type: alert.tradeType,
                          entry_price: alert.entryPrice,
                          stop_loss: alert.stopLoss,
                          tp_hits: alert.tpHits,
                          close_reason: alert.closeReason as any,
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
                        creator={
                          alert.creator
                            ? {
                                id: alert.creator.id,
                                display_name: alert.creator.display_name,
                                role: alert.creator.role || alert.creator.user_type || alert.creator.access_level || 'member',
                                avatar_url: alert.creator.avatar_url,
                                user_type: alert.creator.user_type,
                                access_level: alert.creator.access_level,
                              }
                            : undefined
                        }
                      />
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
        <EconomicSidebar />
      </div>
    </StreamErrorBoundary>
  );
}
