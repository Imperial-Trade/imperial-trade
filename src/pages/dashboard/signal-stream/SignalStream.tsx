import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOptimizedTrading } from '@/hooks/useOptimizedTrading';
import { UpdateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { Loader2, AlertTriangle, Wifi, WifiOff, Shield, Plus } from 'lucide-react';
import TradeAlertCard from '@/components/signals/TradeAlertCard';
import NotificationSystem from '@/components/notifications/NotificationSystem';
import { useOptimizedInstantAlerts } from '@/hooks/useOptimizedInstantAlerts';
import EconomicSidebar from '@/components/widgets/EconomicSidebar';
import { useWebSocketPrices } from '@/contexts/WebSocketPriceContext';
import { useThrottledWebSocketPrice } from '@/hooks/useThrottledWebSocketPrice';
import { useRenderOptimization } from '@/hooks/useRenderOptimization';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SignalStreamFilters } from '@/components/signals/SignalStreamFilters';
import { usePublicProfiles } from '@/hooks/usePublicProfiles';
import { useSignalPermissions } from '@/hooks/useSignalPermissions';
import { useStabilizedSignalOperations } from '@/hooks/useStabilizedSignalOperations';
export default function SignalStream() {
  // Performance monitoring
  useRenderOptimization('SignalStream');

  // Initialize optimized instant alerts (separate from trading operations)
  const {
    isConnected: alertsConnected
  } = useOptimizedInstantAlerts({
    enableAudioNotifications: true,
    enableBrowserNotifications: true,
    enableToastNotifications: true,
    maxRetries: 3,
    baseRetryDelay: 2000
  });
  const {
    user,
    profile
  } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    tradeType: '',
    educator: ''
  });

  // Use the optimized trading hook with real-time updates for all signals
  // Pass the actual user ID for proper authorization, even when showing all signals
  const {
    alerts: allAlerts,
    isLoading,
    error,
    updateAlert,
    refreshAlerts,
    connectionStatus,
    lastUpdated,
    nextRetryAt
  } = useOptimizedTrading(user?.id || '', true); // Pass user ID instead of empty string

  // Use centralized permission management
  const {
    isAdmin,
    isEducator,
    canCreateSignals,
    canEditSignal,
    validateAction
  } = useSignalPermissions();

  // Fetch public profiles for all creators to prevent "Unknown User"
  const creatorIds = useMemo(() => {
    const ids = new Set<string>();
    allAlerts.forEach(a => {
      if (a?.creator?.id) ids.add(a.creator.id);
      // if your alert also carries userId, you could fall back to it:
      // else if (a?.userId) ids.add(a.userId);
    });
    return Array.from(ids);
  }, [allAlerts]);
  const {
    profilesMap
  } = usePublicProfiles(creatorIds);

  // Apply user filters directly to all alerts - optimized processing
  const alerts = useMemo(() => {
    console.log('SignalStream - Processing alerts:', allAlerts.length);

    // Early return if no alerts
    if (allAlerts.length === 0) return [];

    // Single pass enrichment and filtering
    const result = [];
    const searchLower = filters.search?.toLowerCase();
    for (const alert of allAlerts) {
      // Enrich creator data
      const cid = alert.creator?.id;
      const profile = cid ? profilesMap[cid] : undefined;
      const enrichedAlert = profile ? {
        ...alert,
        creator: {
          ...alert.creator,
          id: cid,
          display_name: profile.display_name ?? alert.creator?.display_name ?? 'Member',
          avatar_url: profile.avatar_url ?? alert.creator?.avatar_url,
          role: profile.role ?? alert.creator?.role,
          user_type: profile.user_type ?? alert.creator?.user_type,
          access_level: profile.access_level ?? alert.creator?.access_level
        }
      } : alert;

      // Apply filters in order of likelihood to fail fast
      if (filters.educator && filters.educator !== enrichedAlert.creator?.id) continue;
      if (filters.status && enrichedAlert.status !== filters.status) continue;
      if (filters.tradeType && !enrichedAlert.tradeType.includes(filters.tradeType)) continue;
      if (searchLower && !(enrichedAlert.assetName.toLowerCase().includes(searchLower) || enrichedAlert.tradermadeSymbol.toLowerCase().includes(searchLower) || enrichedAlert.creator?.display_name?.toLowerCase().includes(searchLower))) continue;
      result.push(enrichedAlert);
    }
    return result;
  }, [allAlerts, filters.search, filters.status, filters.tradeType, filters.educator, profilesMap]);

  // Compute derived data in a single pass for efficiency
  const {
    activeAlerts,
    closedAlerts,
    educatorOptions,
    signalCounts
  } = useMemo(() => {
    const active = [];
    const closed = [];
    let buyCount = 0;
    let sellCount = 0;
    const educatorsMap = new Map();

    // Single pass through alerts for all computations
    for (const alert of alerts) {
      // Categorize by status
      if (alert.status === 'active' || alert.status === 'pending') {
        active.push(alert);
      } else if (alert.status === 'closed') {
        closed.push(alert);
      }

      // Count trade types
      if (alert.tradeType.includes('buy')) buyCount++;
      if (alert.tradeType.includes('sell')) sellCount++;
    }

    // Get educators from allAlerts (not filtered alerts)
    for (const alert of allAlerts) {
      const cid = alert.creator?.id;
      if (!cid) continue;
      if (alert.creator && (alert.creator.user_type === 'educator' || alert.creator.access_level === 'admin' || alert.creator.role === 'admin')) {
        const prof = profilesMap[cid];
        const name = prof?.display_name ?? alert.creator.display_name ?? 'Unknown Educator';
        educatorsMap.set(cid, {
          id: cid,
          name
        });
      }
    }
    const educatorsList = Array.from(educatorsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    return {
      activeAlerts: active,
      closedAlerts: closed,
      educatorOptions: educatorsList,
      signalCounts: {
        total: alerts.length,
        active: active.length,
        closed: closed.length,
        buy: buyCount,
        sell: sellCount
      }
    };
  }, [alerts, allAlerts, profilesMap]);
  const sortedClosedAlerts = useMemo(() => {
    return [...closedAlerts].sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()).slice(0, 12);
  }, [closedAlerts]);

  // Extract symbols from active alerts for price subscription
  const symbols = useMemo(() => {
    const symbolSet = new Set<string>();
    for (const alert of activeAlerts) {
      if (alert?.tradermadeSymbol) {
        symbolSet.add(alert.tradermadeSymbol);
      }
    }
    const symbolList = Array.from(symbolSet);

    // Only log in development to reduce console noise
    if (process.env.NODE_ENV === 'development') {
      console.log('SignalStream - Final symbols for price feed:', symbolList);
    }
    return symbolList;
  }, [activeAlerts]);

  // Use throttled WebSocket price subscription to reduce render frequency
  const {
    connectionStatus: priceConnectionStatus
  } = useThrottledWebSocketPrice(symbols, {
    throttleMs: 250,
    // Batch subscriptions for 250ms
    enableBatching: true
  });

  // Use 'WebSocket' as price source for compatibility
  const priceSource = 'WebSocket';

  // Remove local updateInProgress state - now handled by stabilized operations
  const [reconnectIn, setReconnectIn] = useState<number | null>(null);
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

  // Use stabilized signal operations to prevent authorization loops and excessive re-renders
  const {
    handleStatusUpdate,
    handleTakeProfitHit,
    handleStopLossHit,
    handleOrderActivation,
    isUpdateInProgress
  } = useStabilizedSignalOperations({
    updateAlert,
    addNotification: (window as any).addNotification
  });
  return <div className="min-h-screen bg-background w-full">
      <NotificationSystem />
      
      {/* Header - Mobile Optimized spacing */}
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
              
            </div>
            
          </div>
        </div>
      </div>

      {/* Main Content - Mobile Optimized grid layout */}
      <div className="w-full px-2 sm:px-4 py-3 sm:py-6">
        <div className="max-w-none w-full">
          <div className="w-full">
            {/* Reconnect banner when we have data */}
            {connectionStatus === 'connecting' && allAlerts.length > 0 && <div className="mb-3 flex items-center gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-yellow-300">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Reconnecting…</span>
                {typeof reconnectIn === 'number' && reconnectIn > 0 && <span className="text-xs text-yellow-200/80">Retrying in {reconnectIn}s</span>}
              </div>}
            {/* Enhanced Filters */}
            <SignalStreamFilters filters={filters} onFiltersChange={setFilters} educatorOptions={educatorOptions} signalCounts={signalCounts} canCreateSignals={canCreateSignals} onCreateSignal={() => navigate('/dashboard/new-signal')} />
            {isLoading || connectionStatus !== 'connected' && allAlerts.length === 0 ? <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                {Array.from({
              length: 6
            }).map((_, i) => <div key={i} className="rounded-lg border border-border bg-background p-4 animate-pulse">
                    <div className="h-4 w-1/3 bg-muted rounded mb-3" />
                    <div className="h-6 w-2/3 bg-muted rounded mb-4" />
                    <div className="h-24 w-full bg-muted rounded" />
                  </div>)}
              </div> : <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-accent-green mb-4 border-b border-accent-green/20 pb-2">
                    Educational Market Patterns ({activeAlerts.length})
                  </h2>
                  {activeAlerts.length > 0 ? <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                      {activeAlerts.map(alert => <TradeAlertCard key={alert.id} alert={{
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
                }} onStatusUpdate={handleStatusUpdate} onTakeProfitHit={handleTakeProfitHit} onStopLossHit={handleStopLossHit} onOrderActivation={handleOrderActivation} isAdmin={isAdmin} isCreator={canEditSignal(alert.creator?.id)} connectionStatus={priceConnectionStatus as 'connecting' | 'connected' | 'error'} priceSource={priceSource} isRecentClosure={false} creator={alert.creator} />)}
                    </div> : <div className="text-center py-8">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-8 h-8 text-muted-foreground/50" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">No Active Educational Patterns</h3>
                      <p className="text-muted-foreground">New educational analysis patterns will appear here when posted by educational contributors.</p>
                    </div>}
                </div>
                
                <div>
                  <h2 className="text-xl font-semibold text-muted-foreground mb-4 border-b border-border pb-2">
                    Recent Educational Analysis ({closedAlerts.length})
                  </h2>
                  {sortedClosedAlerts.length > 0 ? <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                      {sortedClosedAlerts.map(alert => <TradeAlertCard key={alert.id} alert={{
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
                }} onStatusUpdate={handleStatusUpdate} onTakeProfitHit={handleTakeProfitHit} onStopLossHit={handleStopLossHit} onOrderActivation={handleOrderActivation} isAdmin={isAdmin} isCreator={canEditSignal(alert.creator?.id)} connectionStatus={priceConnectionStatus as 'connecting' | 'connected' | 'error'} priceSource={priceSource} isRecentClosure={true} creator={alert.creator} />)}
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

          {/* Economic Sidebar - Optimized positioning and visibility */}
          
                </div>
              </div>
    </div>;
}