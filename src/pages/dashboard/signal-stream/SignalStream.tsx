import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSafeNavigation } from '@/hooks/useSafeNavigation';
import { useSignalRealtime } from '@/hooks/useSignalRealtime';
import { tradingApiService, TradeAlertWithProfile } from '@/api/services/TradingApiService';
import { UpdateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { Loader2, AlertTriangle, Wifi, WifiOff, Shield, Plus, RefreshCw } from 'lucide-react';
import TradeAlertCard from '@/components/signals/TradeAlertCard';
import EconomicSidebar from '@/components/widgets/EconomicSidebar';
import { useAuthorizationAware } from '@/hooks/useAuthorizationAware';
// PHASE 2: Error boundary for signal stream
import SignalStreamErrorBoundary from '@/components/errors/SignalStreamErrorBoundary';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
import { PriceRefreshButton } from '@/components/signals/PriceRefreshButton';
export default function SignalStream() {
  const {
    user,
    profile
  } = useAuth();
  const {
    navigate,
    isNavigationAvailable,
    navigationError
  } = useSafeNavigation();
  const {
    toast
  } = useToast();

  // State for filtering and modal
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    tradeType: '',
    educator: ''
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [connectionIssue, setConnectionIssue] = useState(false);
  const [lastTimestampUpdate, setLastTimestampUpdate] = useState(Date.now());
  const [isSyncing, setIsSyncing] = useState(false);
  const [excludedSignalIds, setExcludedSignalIds] = useState<Set<string>>(new Set());

  // ✅ FIX: Refs to prevent stale closures in event listeners
  const allAlertsRef = useRef<TradeAlertWithProfile[]>([]);
  const staticClosedAlertsRef = useRef<TradeAlertWithProfile[]>([]);

  // 🔒 Anti-flicker: hydrate once, then never show skeleton again
  const hasHydratedRef = useRef(false);
  
  // Check notification system initialization
  useEffect(() => {
    if (!(window as any).addNotification) {
      console.warn('⚠️ [SignalStream] Custom notification system not initialized, using toast fallback');
      setConnectionIssue(true);
    } else {
      console.log('✅ [SignalStream] Custom notification system initialized');
    }
  }, []);

  // 🚀 DIRECT REALTIME: Use useSignalRealtime directly to eliminate subscription chain storm
  const {
    alerts: allAlerts,
    isLoading: realtimeLoading,
    error: realtimeError,
    connectionStatus,
    lastUpdated,
    nextRetryAt,
    updateAlert,
    refreshAlerts,
    lastUpdatePayload  // ✅ TIER 0 FIX: Get latest UPDATE payload for instant closed signal handling
  } = useSignalRealtime(user?.id || '', true);

  // Manual sync handler
  const handleManualSync = useCallback(async () => {
    setIsSyncing(true);
    console.log('🔄 [Manual Sync] Triggered - refreshing all signals');
    
    try {
      await refreshAlerts(true); // bypassThrottle = true
      
      console.log('✅ [Manual Sync] Complete - all signals refreshed');
      
      toast({
        title: '✅ Synced Successfully',
        description: 'All signals refreshed from database',
        duration: 3000
      });
    } catch (error) {
      console.error('❌ [Manual Sync] Error:', error);
      
      toast({
        title: '❌ Sync Failed',
        description: 'Failed to refresh signals. Please try again.',
        variant: 'destructive',
        duration: 5000
      });
    } finally {
      setIsSyncing(false);
    }
  }, [refreshAlerts, toast]);

  console.log('🔍 DEBUG [SignalStream] Received allAlerts from hook:', {
    totalAlerts: allAlerts.length,
    realtimeLoading,
    connectionStatus,
    firstAlertId: allAlerts[0]?.id || 'no alerts',
    alertStatuses: allAlerts.slice(0, 5).map(a => `${a.tradermadeSymbol}:${a.status}`)
  });

  // Track seconds since last signal update
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(0);
  useEffect(() => {
    if (!lastUpdated) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const lastUpdateTime = typeof lastUpdated === 'number' ? lastUpdated : new Date(lastUpdated).getTime();
      setSecondsSinceUpdate(Math.floor((now - lastUpdateTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);
  useEffect(() => {
    if (!hasHydratedRef.current && (allAlerts.length > 0 || connectionStatus === 'connected' || lastUpdated)) {
      hasHydratedRef.current = true;
    }
  }, [allAlerts.length, connectionStatus, lastUpdated]);

  // ============================================
  // STEP 1 COMPLETE: Duplicate toast listener removed and consolidated
  // Toast logic for TP hits, order activation, and signal creation
  // (Signal closed toast is now in Phase 2 listener below)
  // ============================================
  useEffect(() => {
    const handleTPHit = (event: CustomEvent) => {
      const { signalId, tpLevel, assetName } = event.detail;
      
      console.log('🎯 TP hit event received:', event.detail);
      
      toast({
        title: `🎯 TP${tpLevel} Hit!`,
        description: `${assetName} reached Take Profit ${tpLevel}`,
      });
    };
    
    const handleOrderActivation = (event: CustomEvent) => {
      const { signalId, assetName } = event.detail;
      
      console.log('🚀 Order activation event received:', event.detail);
      
      toast({
        title: '🚀 Order Activated!',
        description: `${assetName} limit order is now active`,
      });
    };
    
    const handleSignalCreated = (event: CustomEvent) => {
      const { signalId, assetName, status } = event.detail;
      
      console.log('🆕 New signal created event received:', event.detail);
      
      toast({
        title: '✅ Signal Created!',
        description: `${assetName} signal is now ${status}`,
      });
    };
    
    window.addEventListener('tp-hit-confirmed', handleTPHit as EventListener);
    window.addEventListener('order-activation-confirmed', handleOrderActivation as EventListener);
    window.addEventListener('signal-created-confirmed', handleSignalCreated as EventListener);
    
    return () => {
      window.removeEventListener('tp-hit-confirmed', handleTPHit as EventListener);
      window.removeEventListener('order-activation-confirmed', handleOrderActivation as EventListener);
      window.removeEventListener('signal-created-confirmed', handleSignalCreated as EventListener);
    };
  }, [toast]);

  // Local state for operations
  const isLoading = realtimeLoading;
  const error = realtimeError;

  // 🚀 CREATE ALERT: Direct API call with optimistic updates
  const createAlert = useCallback(async (dto: any) => {
    try {
      const result = await tradingApiService.createAlert(dto, user?.id || '');
      if (result.success) {
        // ✅ BUG #20 FIX: Dispatch cache invalidation event to force fresh fetch
        window.dispatchEvent(new Event('invalidate-signal-cache'));
        await refreshAlerts();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to create alert:', err);
      return false;
    }
  }, [refreshAlerts, user?.id]);

  // ✅ SECURITY FIX (ERROR #14): Use secure RPC-based authorization
  const { isAdmin, isEducator, canCreateSignals } = useAuthorizationAware();
  
  if (isDevToolsEnabled()) {
    console.log('SignalStream - Secure authorization check:', {
      isAdmin,
      isEducator,
      canCreateSignals,
      userId: user?.id
    });
  }
  // ✅ FIX: Check creator permission using userId (direct FK) as primary source
  const isCreator = useCallback((alert: TradeAlertWithProfile) => {
    if (!profile?.id) return false;
    
    // Primary check: alert.userId is the direct foreign key to user_id column
    const isCreatorByUserId = alert.userId === profile.id;
    
    // Fallback: alert.creator?.id from joined profile data
    const isCreatorByCreatorId = alert.creator?.id === profile.id;
    
    const result = isCreatorByUserId || isCreatorByCreatorId;
    
    if (isDevToolsEnabled()) {
      console.log('🔍 [isCreator Check]:', {
        alertId: alert.id,
        assetName: alert.assetName,
        'alert.userId': alert.userId,
        'alert.creator?.id': alert.creator?.id,
        'profile.id': profile.id,
        isCreatorByUserId,
        isCreatorByCreatorId,
        finalResult: result
      });
    }
    
    return result;
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

  // ✅ BUG FIX #19: Add loading state for closed alerts
  const [isLoadingClosedAlerts, setIsLoadingClosedAlerts] = useState(true);
  
  // PHASE 6: Static Closed Alerts - Single fetch on component mount (MOVED UP)
  const [staticClosedAlerts, setStaticClosedAlerts] = useState<TradeAlertWithProfile[]>([]);
  const {
    activeAlerts,
    educatorOptions,
    signalCounts
  } = useMemo(() => {
    const active = alerts
      .filter(a => 
        (a.status === 'active' || a.status === 'pending' || a.status === 'partially_profited')
        && !excludedSignalIds.has(a.id)
      );

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
      closed: staticClosedAlerts.length,
      // 🎯 PHASE 2: Use static closed alerts count
      buy: alerts.filter(a => a.tradeType.includes('buy')).length,
      sell: alerts.filter(a => a.tradeType.includes('sell')).length
    };
    return {
      activeAlerts: active,
      educatorOptions: educatorsList,
      signalCounts: counts
    };
  }, [alerts, allAlerts, staticClosedAlerts.length, excludedSignalIds]);

  // ✅ FIX: Keep refs in sync with state to prevent stale closures
  useEffect(() => {
    allAlertsRef.current = allAlerts;
    staticClosedAlertsRef.current = staticClosedAlerts;
  }, [allAlerts, staticClosedAlerts]);

  const [totalClosedCount, setTotalClosedCount] = useState(0);
  useEffect(() => {
    const fetchStaticClosedAlerts = async () => {
      setIsLoadingClosedAlerts(true); // ✅ BUG FIX #19: Set loading state
      try {
        console.log('📊 PHASE 6 + BUG #19: Fetching static closed alerts with loading state');
        const {
          data: closedAlertsData,
          error
        } = await supabase.from('trade_alerts').select('*').eq('status', 'closed').order('updated_at', {
          ascending: false
        }).limit(12);
        if (error) {
          console.error('Failed to fetch static closed alerts:', error);
          setIsLoadingClosedAlerts(false); // ✅ BUG FIX #19
          return;
        }

        // Get profiles for these alerts
        const userIds = [...new Set((closedAlertsData || []).map(alert => alert.user_id))];
        const {
          data: profilesData,
          error: profilesError
        } = await supabase.from('profiles').select('*').in('id', userIds);
        if (profilesError) {
          console.error('Failed to fetch profiles for closed alerts:', profilesError);
        }

        // Create profile map
        const profilesMap = new Map();
        if (profilesData) {
          profilesData.forEach(profile => {
            profilesMap.set(profile.id, profile);
          });
        }

        // Get total count
        const {
          count,
          error: countError
        } = await supabase.from('trade_alerts').select('*', {
          count: 'exact',
          head: true
        }).eq('status', 'closed');
        if (countError) {
          console.error('Failed to fetch closed alerts count:', countError);
        }
        const mappedAlerts: TradeAlertWithProfile[] = (closedAlertsData || []).map(alert => {
          const profile = profilesMap.get(alert.user_id);
          return {
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
            creator: profile ? {
              id: profile.id,
              display_name: profile.display_name || 'Anonymous User',
              role: profile.role || 'user',
              avatar_url: profile.avatar_url,
              user_type: profile.user_type,
              access_level: profile.access_level
            } : {
              id: alert.user_id,
              display_name: 'Unknown User',
              role: 'user',
              avatar_url: null,
              user_type: null,
              access_level: null
            }
          };
        });
        setStaticClosedAlerts(mappedAlerts);
        setTotalClosedCount(count || 0);
        console.log(`📊 PHASE 6 + BUG #19: Loaded ${mappedAlerts.length} static closed alerts, total: ${count}`);
      } catch (error) {
        console.error('Error fetching static closed alerts:', error);
      } finally {
        setIsLoadingClosedAlerts(false); // ✅ BUG FIX #19: Clear loading state
      }
    };
    fetchStaticClosedAlerts();
  }, []); // Only fetch once on mount

  // ============================================
  // SMART TIMESTAMP REFRESH: Update "time ago" every 60s without refetching
  // ============================================
  useEffect(() => {
    console.log('⏱️ [Timestamp Refresh] Starting 60-second interval for closed alerts');
    
    const timestampInterval = setInterval(() => {
      const now = Date.now();
      setLastTimestampUpdate(now);
      console.log('⏱️ [Timestamp Refresh] Triggered - UI will recalculate "time ago" displays');
    }, 60000); // 60 seconds

    return () => {
      console.log('⏱️ [Timestamp Refresh] Clearing interval on component unmount');
      clearInterval(timestampInterval);
    };
  }, []);

  // ✅ SIMPLIFIED: React to state changes directly (no events, no tiers, no DB fetches)
  useEffect(() => {
    const alreadyClosedIds = new Set(staticClosedAlerts.map(a => a.id));
    
    const newlyClosedSignals = allAlerts.filter(signal => 
      signal.status === 'closed' && 
      !alreadyClosedIds.has(signal.id) &&
      !excludedSignalIds.has(signal.id)
    );

    if (newlyClosedSignals.length > 0) {
      console.log(`✅ [State Change] ${newlyClosedSignals.length} signal(s) closed - moving to closed alerts`);

      // Add to closed alerts
    setStaticClosedAlerts(prev => {
      // Sort newly closed signals by timestamp (newest first)
      const sorted = [...newlyClosedSignals].sort((a, b) => {
        const timeA = new Date(a.updatedAt).getTime();
        const timeB = new Date(b.updatedAt).getTime();
        return timeB - timeA; // Descending: newest first
      });
      
      return [...sorted, ...prev].slice(0, 12);
    });
      
      // Update total count
      setTotalClosedCount(prev => prev + newlyClosedSignals.length);
      
      // Exclude from active alerts
      setExcludedSignalIds(prev => {
        const next = new Set(prev);
        newlyClosedSignals.forEach(s => next.add(s.id));
        return next;
      });

      // Show toast for each closed signal
      newlyClosedSignals.forEach(signal => {
        let toastTitle = '🔒 Signal Closed';
        let toastDescription = `${signal.assetName} closed: ${signal.closeReason || 'Manual'}`;
        let toastVariant: 'default' | 'destructive' = 'default';

        if (signal.closeReason === 'stop_loss') {
          toastTitle = '🔴 Stop Loss Hit';
          toastDescription = `${signal.assetName} signal closed at SL`;
          toastVariant = 'destructive';
        } else if (signal.closeReason === 'all_tps_hit') {
          toastTitle = '💰 All Targets Hit!';
          toastDescription = `${signal.assetName} - All take profits reached`;
        } else if (signal.closeReason?.startsWith('tp')) {
          toastTitle = '🟢 Take Profit Hit';
          const tpNum = signal.closeReason.replace('tp', '').replace('_hit', '');
          toastDescription = `${signal.assetName} closed at TP${tpNum}`;
        } else if (signal.closeReason === 'manual') {
          toastDescription = `${signal.assetName} closed manually`;
        }
        
        toast({ title: toastTitle, description: toastDescription, variant: toastVariant });
      });
    }
  }, [allAlerts, staticClosedAlerts, excludedSignalIds, toast]);

  // Listen for new signal creation and scroll to top
  useEffect(() => {
    const handleNewSignalCreated = (event: CustomEvent) => {
      const newSignal = event.detail;
      console.log('🆕 [SignalStream] Received signal-created-confirmed event:', newSignal);
      
      if (!newSignal?.id) {
        console.warn('⚠️ [SignalStream] Invalid new signal data received');
        return;
      }

      // Scroll to top to show new signal
      window.scrollTo({ top: 0, behavior: 'smooth' });
      console.log('✅ [SignalStream] Scrolled to top for new signal');

      // Show toast notification
      toast({
        title: '🎯 New Signal Added',
        description: `${newSignal.assetName || 'Signal'} is now live in Active Alerts`,
      });
    };

    window.addEventListener('signal-created-confirmed', handleNewSignalCreated as EventListener);
    
    return () => {
      window.removeEventListener('signal-created-confirmed', handleNewSignalCreated as EventListener);
    };
  }, []);

  const sortedClosedAlerts = useMemo(() => {
    // PHASE 6: Use static closed alerts instead of real-time filtered ones
    return staticClosedAlerts;
  }, [staticClosedAlerts]);

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

  // ✅ BUG FIX #18: Optimize symbols with deep equality check to prevent WebSocket churn
  const prevSymbolsRef = useRef<string[]>([]);
  const prevSymbolsHashRef = useRef<string>('');
  
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

    // 🎯 DEEP EQUALITY CHECK: Return same reference if content identical
    const prev = prevSymbolsRef.current;
    if (JSON.stringify(prev) === JSON.stringify(symbolList)) {
      if (isDevToolsEnabled()) {
        console.log('🔒 SignalStream - Symbols unchanged (deep equality), returning same reference');
      }
      return prev; // Return SAME reference to prevent useEffect re-run
    }
    if (isDevToolsEnabled()) {
      console.log('🔄 SignalStream - Symbols changed:', {
        prev,
        new: symbolList
      });
    }
    prevSymbolsRef.current = symbolList;
    return symbolList;
  }, [activeAlerts, alerts]);

  // 🎯 CRITICAL: Register UI activity to enable price ingestor processing
  const {
    registerInteraction
  } = useUIActivityRegistration(symbols);
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

  // 🎯 FIXED: Update subscriptions when symbols change (subscribe is stable now)
  useEffect(() => {
    if (symbols.length > 0) {
      subscribe(symbols);
      if (isDevToolsEnabled()) {
        console.log('🚀 SignalStream - Subscribing to symbols:', symbols);
      }
    }
  }, [symbols]); // ✅ Only depend on symbols - subscribe is now stable

  // 🎯 Separate cleanup effect - only unsubscribe on unmount
  useEffect(() => {
    const currentSymbols = symbols; // Capture current symbols
    return () => {
      if (currentSymbols.length > 0) {
        if (isDevToolsEnabled()) {
          console.log('🧹 SignalStream - Component unmounting, cleaning up subscriptions:', currentSymbols);
        }
        unsubscribe(currentSymbols);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run cleanup on unmount
  // Handle creating new signal
  const handleCreateSignal = async (data: TradeAlertSubmissionData) => {
    if (!user?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create educational patterns.",
        variant: "destructive"
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
          description: `${data.asset_name} ${data.trade_type.replace('_', ' ').toUpperCase()} educational analysis has been posted.`
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
        variant: "destructive"
      });
    }
  };
  // 🚨 PHASE 2B FIX (Bug #3): Replace State with Ref to prevent blocking between signals
  const updateInProgressRef = useRef(new Map<string, boolean>());
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
            <Loader2 className="w-3 h-3 mr-1" style={{
            willChange: 'transform',
            transform: 'translateZ(0)'
          }} />
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
  // ✅ BUG FIX #17: Memoize all callbacks with stable dependencies
  const handleStatusUpdate = useCallback(async (alert: any, newStatus: string) => {
    console.log('🎬 [SignalStream] handleStatusUpdate CALLED:', {
      alertId: alert.id,
      newStatus,
      currentStatus: alert.status,
      timestamp: new Date().toISOString()
    });
    
    // ✅ Check if already processing THIS specific signal
    if (updateInProgressRef.current.get(alert.id)) {
      console.log(`⏸️  [Update Blocked] Signal ${alert.id} already processing`);
      return;
    }

    // ✅ Verify alert object is valid
    if (!alert || !alert.id) {
      console.error('❌ Invalid alert object:', alert);
      toast({
        title: '❌ Invalid signal',
        description: 'Signal data is missing or corrupted',
        variant: 'destructive'
      });
      return;
    }

    // Check if user can edit this signal (creator or admin only)
    const alertIsCreator = isCreator(alert.creator?.id) || alert.userId === profile?.id;
    
    if (!alertIsCreator && !isAdmin) {
      console.error('❌ Authorization failed');
      toast({
        title: '🚫 Access Denied',
        description: 'You can only close your own signals',
        variant: 'destructive'
      });
      return;
    }

    // ✅ Lock signal during update
    updateInProgressRef.current.set(alert.id, true);
    console.log(`🔒 [Update Started] Signal ${alert.id} locked`);
    
    try {
      // ============================================
      // FIX #2: Use RPC for closing signals
      // ============================================
      if (newStatus === 'closed') {
        console.log('🔒 Closing signal via RPC...', alert.id);
        
        const { data, error } = await supabase.rpc('close_trade_alert', {
          p_alert_id: alert.id,
          p_user_id: profile?.id || user?.id,
          p_close_reason: 'manual'
        });
        
        if (error) {
          console.error('❌ RPC close_trade_alert failed:', error);
          throw new Error(error.message || 'Failed to close signal');
        }
        
        console.log('✅ Signal closed via RPC:', data);
        
        // ✅ Dispatch event for instant UI update
        window.dispatchEvent(new CustomEvent('signal-closed-confirmed', {
          detail: {
            signalId: alert.id,
            assetName: alert.assetName,
            closeReason: 'manual',
            timestamp: new Date().toISOString()
          }
        }));
        
        // ✅ Force refresh with cache bypass
        await refreshAlerts(true);
        
        toast({
          title: '✅ Signal Closed',
          description: `${alert.assetName} has been closed successfully`
        });
        
      } else {
        // For other status updates, use existing logic
        const updateDto: UpdateTradeAlertDto = {
          status: newStatus as 'pending' | 'active' | 'closed'
        };
        
        const result = await updateAlert(alert.id, updateDto);
        
        if (!result) {
          throw new Error('Update failed');
        }
        
        toast({
          title: '✅ Status Updated',
          description: `Signal status changed to ${newStatus}`
        });
      }
      
    } catch (error: any) {
      console.error('💥 [SignalStream] Status update failed:', error);
      
      toast({
        title: '❌ Update Failed',
        description: error.message || 'Please try again',
        variant: 'destructive'
      });
      
    } finally {
      // ✅ Always unlock signal
      updateInProgressRef.current.delete(alert.id);
      console.log(`🔓 [Update Complete] Signal ${alert.id} unlocked`);
    }
  }, [updateAlert, profile, user, isAdmin, isCreator, toast, refreshAlerts, supabase]);
  const handleTakeProfitHit = useCallback(async (alert: any, newTPHits: number[], shouldAutoClose = false, closeReason: string | null = null) => {
    // 🔍 PHASE 1 DIAGNOSTIC: Log what we receive
    console.log(`🔍 [PHASE 1 - handleTakeProfitHit] Called for ${alert.asset_name}:`, {
      alertId: alert.id,
      newTPHits,
      shouldAutoClose,
      closeReason,
      currentStatus: alert.status,
      currentTPHits: alert.tp_hits,
      hasTP5: alert.tp5 != null && alert.tp5 > 0,
      allTPs: { tp1: alert.tp1, tp2: alert.tp2, tp3: alert.tp3, tp4: alert.tp4, tp5: alert.tp5 }
    });
    
    if (updateInProgressRef.current.get(alert.id)) {
      console.log(`⏸️  [Update Blocked] Signal ${alert.id} already processing`);
      return;
    }

    // Check if user can edit this signal (creator or admin only)
    const alertIsCreator = isCreator(alert.creator?.id);
    if (!alertIsCreator && !isAdmin) {
      return;
    }
    updateInProgressRef.current.set(alert.id, true);
    console.log(`🔒 [Update Started] Signal ${alert.id} locked`);
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
      
      // 🔍 PHASE 2 DIAGNOSTIC: Verify DTO structure
      console.log(`🔍 [PHASE 2 - updateDto] Built for ${alert.id}:`, {
        updateDto,
        shouldAutoCloseCondition: shouldAutoClose,
        typedCloseReason,
        willCloseSignal: shouldAutoClose && updateDto.status === 'closed'
      });
      
      const result = await updateAlert(alert.id, updateDto);
      
      // 🔍 PHASE 3 DIAGNOSTIC: Verify update result
      console.log(`🔍 [PHASE 3 - updateAlert Result] For ${alert.id}:`, {
        success: !!result,
        resultStatus: result?.status,
        resultCloseReason: result?.closeReason,
        resultTPHits: result?.tpHits,
        expectedStatus: shouldAutoClose ? 'closed' : alert.status,
        originalUpdateDto: updateDto
      });
      
      if (result) {
        // ✅ FIX #1: Dispatch event when signal closes
        if (shouldAutoClose) {
          window.dispatchEvent(new CustomEvent('signal-closed-confirmed', {
            detail: {
              signalId: alert.id,
              closeReason: typedCloseReason || 'all_tps_hit',
              assetName: alert.assetName
            }
          }));
          
          // ✅ Force refresh to bypass all caches
          await refreshAlerts(true);
        } else {
          // Dispatch TP hit event
          const highestTP = newTPHits.length > 0 ? Math.max(...newTPHits) : null;
          if (highestTP !== null) {
            window.dispatchEvent(new CustomEvent('tp-hit-confirmed', {
              detail: {
                signalId: alert.id,
                tpLevel: highestTP,
                assetName: alert.assetName
              }
            }));
          }
        }
        
        // Show notification
        if ((window as any).addNotification) {
          const highestTP = newTPHits.length > 0 ? Math.max(...newTPHits) : null;
          if (highestTP !== null) {
            (window as any).addNotification({
              type: 'tp_hit',
              title: `🎯 TP${highestTP} Hit!`,
              message: `${alert.assetName} reached Take Profit ${highestTP}`
            });
          }
        }
      }
    } catch (err) {
      console.error("Failed to update TP hits:", err);
    } finally {
      updateInProgressRef.current.delete(alert.id);
      console.log(`🔓 [Update Complete] Signal ${alert.id} unlocked`);
    }
  }, [updateAlert, profile, isAdmin, isCreator]);
  const handleStopLossHit = useCallback(async (alert: any, closeReason: string) => {
    if (updateInProgressRef.current.get(alert.id)) {
      console.log(`⏸️  [Update Blocked] Signal ${alert.id} already processing`);
      return;
    }

    // Check if user can edit this signal (creator or admin only)
    const alertIsCreator = isCreator(alert);
    if (!alertIsCreator && !isAdmin) {
      return;
    }
    updateInProgressRef.current.set(alert.id, true);
    console.log(`🔒 [Update Started] Signal ${alert.id} locked`);
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
      
      if (result) {
        // ✅ FIX #1: Dispatch event for instant UI update
        window.dispatchEvent(new CustomEvent('signal-closed-confirmed', {
          detail: {
            signalId: alert.id,
            closeReason: typedCloseReason,
            assetName: alert.assetName
          }
        }));
        
        // ✅ Force refresh to bypass all caches
        await refreshAlerts(true);
        
        // Show notification
        if ((window as any).addNotification) {
          (window as any).addNotification({
            type: 'stop_loss',
            title: `🚨 Stop Loss Hit!`,
            message: `${alert.assetName} trade closed at stop loss`
          });
        }
      }
    } catch (err) {
      console.error("Failed to update stop loss:", err);
    } finally {
      updateInProgressRef.current.delete(alert.id);
      console.log(`🔓 [Update Complete] Signal ${alert.id} unlocked`);
    }
  }, [updateAlert, profile, isAdmin, isCreator]);
  const handleOrderActivation = useCallback(async (alert: any) => {
    if (updateInProgressRef.current.get(alert.id)) {
      console.log(`⏸️  [Update Blocked] Signal ${alert.id} already processing`);
      return;
    }

    // Check if user can edit this signal (creator or admin only)
    const alertIsCreator = isCreator(alert.creator?.id);
    if (!alertIsCreator && !isAdmin) {
      return;
    }
    updateInProgressRef.current.set(alert.id, true);
    console.log(`🔒 [Update Started] Signal ${alert.id} locked`);
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
      updateInProgressRef.current.delete(alert.id);
      console.log(`🔓 [Update Complete] Signal ${alert.id} unlocked`);
    }
  }, [updateAlert, profile, isAdmin, isCreator]);
  
  // PHASE 2: Wrap entire signal stream with error boundary
  return <SignalStreamErrorBoundary>
    <StreamErrorBoundary>
      <div className="min-h-screen bg-background w-full">
        <GlobalLeadershipBanner />
        
        {/* Header - Mobile Optimized spacing */}
        <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="w-full px-2 sm:px-4 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="min-w-0 flex-1">
                
                <p className="text-sm sm:text-base text-muted-foreground hidden">
                  Educational market analysis patterns with reference pricing from verified educational contributors
                </p>
              </div>
              
              {/* ✅ BUG FIX #10: Connection Status with Manual Recovery */}
              <div className="flex items-center gap-3">
                {/* ✅ FIX #6: Force Refresh Button */}
                <Button
                  onClick={() => {
                    console.log('🔄 [Manual] Force refresh triggered by user');
                    refreshAlerts(true);
                  }}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2 border-blue-500/20 hover:bg-blue-500/10 text-blue-500"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span className="hidden sm:inline">Force Refresh</span>
                </Button>
                
                {connectionStatus === 'connected' && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-500 font-medium">Live</span>
                  </div>
                )}
                {connectionStatus === 'connecting' && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-yellow-500 font-medium">Connecting...</span>
                  </div>
                )}
                {(connectionStatus === 'disconnected' || connectionStatus === 'error' || connectionIssue) && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-xs text-red-500 font-medium">Connection Issue</span>
                    </div>
                    <Button
                      onClick={() => refreshAlerts(true)}
                      size="sm"
                      variant="outline"
                      className="border-yellow-500/20 hover:bg-yellow-500/10"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Now
                    </Button>
                  </div>
                )}
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
              <div data-prevent-widget-open="true" className="flex items-center gap-3">
                <div className="flex-1">
                  <SignalStreamFilters filters={filters} onFiltersChange={setFilters} educatorOptions={educatorOptions} signalCounts={signalCounts} canCreateSignals={canCreateSignals} onCreateSignal={() => setShowCreateModal(true)} />
                </div>
                <PriceRefreshButton symbols={symbols} className="shrink-0" />
                <Button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  variant="outline"
                  size="sm"
                  className="gap-2 shrink-0"
                  title="Force refresh all signals from database"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Force Sync</span>
                    </>
                  )}
                </Button>
              </div>
              
            {!hasHydratedRef.current && (isLoading || connectionStatus !== 'connected' && allAlerts.length === 0) ? <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
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
                      <span className="bg-clip-text text-transparent font-medium" style={{
                    background: 'linear-gradient(135deg, hsl(45, 70%, 70%), hsl(45, 80%, 50%), hsl(45, 90%, 30%))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                        Alerts
                      </span>
                      <span className="text-imperial-platinum"> ({activeAlerts.length})</span>
                     </h2>
                     {activeAlerts.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {activeAlerts.map(alert => <TradeAlertCard
                            key={alert.id}
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
                            isCreator={isCreator(alert)}
                            livePrice={livePrices[alert.tradermadeSymbol] || livePrices[alert.assetName.toUpperCase()]} 
                            connectionStatus={priceConnectionStatus as 'connecting' | 'connected' | 'error'} 
                            priceSource={priceSource} 
                            isRecentClosure={false} 
                            creator={alert.creator} 
                            justAdded={justAddedIds.has(alert.id)} 
                          />)}
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
                      <span className="bg-clip-text text-transparent font-medium" style={{
                    background: 'linear-gradient(135deg, hsl(45, 70%, 70%), hsl(45, 80%, 50%), hsl(45, 90%, 30%))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                        Alerts
                      </span>
                      <span className="text-imperial-platinum"> ({totalClosedCount})</span>
                    </h2>
                    {isLoadingClosedAlerts ? (
                      // ✅ BUG FIX #19: Skeleton UI for closed alerts loading
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="rounded-lg border border-border bg-background p-4 animate-pulse">
                            <div className="h-4 w-1/3 bg-muted rounded mb-3" />
                            <div className="h-6 w-2/3 bg-muted rounded mb-4" />
                            <div className="h-24 w-full bg-muted rounded" />
                          </div>
                        ))}
                      </div>
                    ) : sortedClosedAlerts.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {sortedClosedAlerts.map(alert => <TradeAlertCard
                            key={`${alert.id}-${lastTimestampUpdate}`}
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
                            isCreator={isCreator(alert)}
                            livePrice={undefined} 
                            connectionStatus={priceConnectionStatus as 'connecting' | 'connected' | 'error'} 
                            priceSource={priceSource} 
                            isRecentClosure={true} 
                            creator={alert.creator} 
                          />)}
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
            <div data-prevent-widget-open="true" className="space-y-4">
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
             <OptimizedNewAlertForm onSubmit={handleCreateSignal} onCancel={() => setShowCreateModal(false)} />
           </DialogContent>
         </Dialog>
      </div>
    </StreamErrorBoundary>
  </SignalStreamErrorBoundary>;
}