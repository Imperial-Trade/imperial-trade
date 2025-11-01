import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSafeNavigation } from '@/hooks/useSafeNavigation';
import { useSignalRealtime } from '@/hooks/useSignalRealtime';
import { tradingApiService, TradeAlertWithProfile } from '@/api/services/TradingApiService';
import { UpdateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { Loader2, AlertTriangle, Wifi, WifiOff, Plus, RefreshCw } from 'lucide-react';
import { calculatePipsForSignal } from '@/utils/pipsCalculator';
import { TrendlineEmptyState } from '@/components/empty-states/TrendlineEmptyState';
import { MagnifyingSearchEmptyState } from '@/components/empty-states/MagnifyingSearchEmptyState';
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
import { useSignalTheme } from '@/hooks/useSignalTheme';
export default function SignalStream() {
  const {
    colors
  } = useSignalTheme();
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
    status: 'all',
    tradeType: 'all',
    educator: 'all',
    selectedEducators: [] as string[]
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [connectionIssue, setConnectionIssue] = useState(false);
  const [lastTimestampUpdate, setLastTimestampUpdate] = useState(Date.now());
  const [isSyncing, setIsSyncing] = useState(false);
  const [excludedSignalIds, setExcludedSignalIds] = useState<Set<string>>(new Set());

  // 🎯 HYBRID TP DETECTION: Get live prices from WebSocket
  const {
    prices
  } = useOptimizedWebSocketPrices();

  // ✅ FIX: Refs to prevent stale closures in event listeners
  const allAlertsRef = useRef<TradeAlertWithProfile[]>([]);
  const staticClosedAlertsRef = useRef<TradeAlertWithProfile[]>([]);

  // 🔒 Anti-flicker: Always render immediately, no hydration blocking
  const hasHydratedRef = useRef(true);

  // 🔒 DEDUPLICATION: Prevent duplicate TP/SL processing
  const processingSignalsRef = useRef<Set<string>>(new Set());
  const processedHitsRef = useRef<Map<string, {
    timestamp: number;
    type: 'sl' | 'tp';
    level?: number;
  }>>(new Map());

  // 🔒 TOAST DEDUPLICATION: Track signals handled by instant detection to prevent double toasts
  const instantToastHandledRef = useRef<Set<string>>(new Set());

  // 🔒 PERSISTENT TOAST TRACKING: Track "All Targets Hit" toasts shown across component remounts
  const SHOWN_ALL_TP_KEY = 'imperial-shown-all-tp-toasts';
  const getShownAllTPToasts = (): Set<string> => {
    try {
      const stored = sessionStorage.getItem(SHOWN_ALL_TP_KEY);
      return new Set(stored ? JSON.parse(stored) : []);
    } catch {
      return new Set();
    }
  };
  const markAllTPToastShown = (signalId: string) => {
    try {
      const shown = getShownAllTPToasts();
      shown.add(signalId);
      sessionStorage.setItem(SHOWN_ALL_TP_KEY, JSON.stringify([...shown]));
    } catch (err) {
      console.error('Failed to persist toast state:', err);
    }
  };

  // 🔒 TIER 1: Backend Detection Tracking - Prevent frontend from re-processing backend-handled events
  const backendProcessedRef = useRef<Set<string>>(new Set());

  // 🚀 TIER 2: Performance - Cache creator checks to prevent redundant computations
  const creatorCheckCache = useRef(new Map<string, boolean>());

  // Check notification system initialization
  useEffect(() => {
    if (!(window as any).addNotification) {
      console.warn('⚠️ [SignalStream] Custom notification system not initialized, using toast fallback');
      setConnectionIssue(true);
    } else {
      console.log('✅ [SignalStream] Custom notification system initialized');
    }
  }, []);

  // Clean up old processed hits every 30 seconds
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      const entries = Array.from(processedHitsRef.current.entries());
      entries.forEach(([key, value]) => {
        // Remove processed hits older than 60 seconds
        if (now - value.timestamp > 60000) {
          processedHitsRef.current.delete(key);
          console.log(`🧹 [Cleanup] Removed old processed hit: ${key}`);
        }
      });
    }, 30000);
    return () => clearInterval(cleanup);
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
    lastUpdatePayload,
    optimisticallyUpdateSignal,
    optimisticallyAddSignal
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

  // ============================================
  // STEP 1 COMPLETE: Duplicate toast listener removed and consolidated
  // Toast logic for TP hits, order activation, and signal creation
  // (Signal closed toast is now in Phase 2 listener below)
  // ============================================
  useEffect(() => {
    const handleTPHit = (event: CustomEvent) => {
      const {
        signalId,
        tpLevel,
        assetName
      } = event.detail;
      console.log('🎯 TP hit event received:', event.detail);

      // 🔒 TIER 1: Mark as backend-processed
      const tpKey = `${signalId}-tp${tpLevel}`;
      backendProcessedRef.current.add(tpKey);

      // Clear after 10 seconds
      setTimeout(() => {
        backendProcessedRef.current.delete(tpKey);
      }, 10000);
      toast({
        title: `🎯 TP${tpLevel} Hit!`,
        description: `${assetName} reached Take Profit ${tpLevel}`
      });
    };
    const handleOrderActivation = (event: CustomEvent) => {
      const {
        signalId,
        assetName
      } = event.detail;
      console.log('🚀 Order activation event received:', event.detail);
      toast({
        title: '🚀 Order Activated!',
        description: `${assetName} limit order is now active`
      });
    };
    const handleSignalCreated = (event: CustomEvent) => {
      const {
        signalId,
        assetName,
        status
      } = event.detail;
      console.log('🆕 New signal created event received:', event.detail);
      toast({
        title: '✅ Signal Created!',
        description: `${assetName} signal is now ${status}`
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
  const {
    isAdmin,
    isEducator,
    canCreateSignals
  } = useAuthorizationAware();
  if (isDevToolsEnabled()) {
    console.log('SignalStream - Secure authorization check:', {
      isAdmin,
      isEducator,
      canCreateSignals,
      userId: user?.id
    });
  }
  // ✅ FIX: Check creator permission using userId (direct FK) as primary source
  // 🚀 TIER 2: Memoized with cache to prevent redundant computations
  const isCreator = useCallback((alert: TradeAlertWithProfile) => {
    if (!profile?.id) return false;

    // 🚀 TIER 2: Check cache first
    const cacheKey = `${alert.id}-${profile.id}`;
    if (creatorCheckCache.current.has(cacheKey)) {
      return creatorCheckCache.current.get(cacheKey)!;
    }

    // Primary check: alert.userId is the direct foreign key to user_id column
    const isCreatorByUserId = alert.userId === profile.id;

    // Fallback: alert.creator?.id from joined profile data
    const isCreatorByCreatorId = alert.creator?.id === profile.id;
    const result = isCreatorByUserId || isCreatorByCreatorId;

    // 🚀 TIER 2: Cache the result
    creatorCheckCache.current.set(cacheKey, result);
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

  // 🚀 TIER 2: Clear creator check cache when profile changes
  useEffect(() => {
    creatorCheckCache.current.clear();
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
    if (filters.status && filters.status !== 'all') {
      filteredAlerts = filteredAlerts.filter(alert => alert.status === filters.status);
    }
    if (filters.tradeType && filters.tradeType !== 'all') {
      filteredAlerts = filteredAlerts.filter(alert => alert.tradeType.includes(filters.tradeType));
    }
    if (filters.selectedEducators && filters.selectedEducators.length > 0) {
      filteredAlerts = filteredAlerts.filter(alert => filters.selectedEducators.includes(alert.userId || '') || filters.selectedEducators.includes(alert.creator?.id || ''));
    } else if (filters.educator && filters.educator !== 'all') {
      filteredAlerts = filteredAlerts.filter(alert => alert.creator?.id === filters.educator);
    }
    return filteredAlerts;
  }, [allAlerts, filters]);

  // ✅ BUG FIX #19: Add loading state for closed alerts
  const [isLoadingClosedAlerts, setIsLoadingClosedAlerts] = useState(true);

  // PHASE 6: Static Closed Alerts - Single fetch on component mount (MOVED UP)
  const [staticClosedAlerts, setStaticClosedAlerts] = useState<TradeAlertWithProfile[]>([]);

  // ============================================
  // SINGLE SOURCE OF TRUTH: Database counts with real-time updates
  // ============================================
  const [databaseCounts, setDatabaseCounts] = useState({
    total: 0,
    active: 0,
    closed: 0,
    buy: 0,
    // buy + buy_limit combined
    sell: 0,
    // sell + sell_limit combined
    buy_only: 0,
    // for internal tracking
    sell_only: 0,
    // for internal tracking
    buy_limit: 0,
    // for internal tracking
    sell_limit: 0 // for internal tracking
  });

  // All current educators with signals
  const [allEducatorsWithSignals, setAllEducatorsWithSignals] = useState<Array<{
    id: string;
    name: string;
    signalCount: number;
  }>>([]);

  // ============================================
  // EDUCATOR-SPECIFIC COUNTS: Dynamically calculated based on selected educator
  // ============================================
  const educatorSpecificCounts = useMemo(() => {
    // If multiple educators selected, calculate counts for all of them
    if (filters.selectedEducators && filters.selectedEducators.length > 0) {
      const educatorAlerts = [...allAlerts, ...staticClosedAlerts].filter(alert => filters.selectedEducators.includes(alert.userId || '') || filters.selectedEducators.includes(alert.creator?.id || ''));
      const activeCount = educatorAlerts.filter(a => ['active', 'pending', 'partially_profited'].includes(a.status)).length;
      const closedCount = educatorAlerts.filter(a => a.status === 'closed').length;
      const buyCount = educatorAlerts.filter(a => a.tradeType.includes('buy')).length;
      const sellCount = educatorAlerts.filter(a => a.tradeType.includes('sell')).length;
      return {
        total: educatorAlerts.length,
        active: activeCount,
        closed: closedCount,
        buy: buyCount,
        sell: sellCount
      };
    }

    // If no educator is selected, return global database counts
    if (!filters.educator) {
      return {
        total: databaseCounts.total,
        active: databaseCounts.active,
        closed: databaseCounts.closed,
        buy: databaseCounts.buy,
        sell: databaseCounts.sell
      };
    }

    // Calculate counts for the selected educator only
    const educatorAlerts = [...allAlerts, ...staticClosedAlerts].filter(alert => alert.userId === filters.educator || alert.creator?.id === filters.educator);

    // Count by status
    const activeCount = educatorAlerts.filter(a => ['active', 'pending', 'partially_profited'].includes(a.status)).length;
    const closedCount = educatorAlerts.filter(a => a.status === 'closed').length;

    // Count by trade type (combined)
    const buyCount = educatorAlerts.filter(a => a.tradeType.includes('buy')).length;
    const sellCount = educatorAlerts.filter(a => a.tradeType.includes('sell')).length;
    console.log(`📊 Educator-specific counts for ${filters.educator}:`, {
      total: educatorAlerts.length,
      active: activeCount,
      closed: closedCount,
      buy: buyCount,
      sell: sellCount
    });
    return {
      total: educatorAlerts.length,
      active: activeCount,
      closed: closedCount,
      buy: buyCount,
      sell: sellCount
    };
  }, [filters.educator, filters.selectedEducators, allAlerts, staticClosedAlerts, databaseCounts]);

  // ✅ CRITICAL FIX: Separate educator metadata from active alerts data flow
  const educatorMetadata = useMemo(() => {
    return {
      educatorOptions: allEducatorsWithSignals,
      signalCounts: educatorSpecificCounts
    };
  }, [allEducatorsWithSignals, educatorSpecificCounts]);

  // ✅ FIX: Keep refs in sync with state to prevent stale closures
  useEffect(() => {
    allAlertsRef.current = allAlerts;
    staticClosedAlertsRef.current = staticClosedAlerts;
  }, [allAlerts, staticClosedAlerts]);
  const [totalClosedCount, setTotalClosedCount] = useState(0);

  // ============================================
  // FETCH ACCURATE COUNTS FROM DATABASE (Updates on signal changes)
  // ============================================
  useEffect(() => {
    const fetchDatabaseCounts = async () => {
      try {
        console.log('📊 Fetching database counts and educators...');

        // Step 1: Get ALL users who are currently educators/admins
        const {
          data: educators
        } = await supabase.from('profiles').select('id, display_name, user_type, access_level, role').or('user_type.eq.educator,access_level.eq.admin,access_level.eq.moderator,role.eq.admin');
        if (!educators || educators.length === 0) {
          console.warn('No educators found');
          return;
        }
        const educatorIds = educators.map(e => e.id);
        console.log('✅ Found educators:', educatorIds.length);

        // Step 2: Get ALL signals from these educators only
        const {
          data: allSignals
        } = await supabase.from('trade_alerts').select('id, status, trade_type, user_id').in('user_id', educatorIds);
        if (!allSignals) {
          console.error('Failed to fetch signals');
          return;
        }

        // Step 3: Calculate counts based on ALL educator signals
        const buyOnly = allSignals.filter(s => s.trade_type === 'buy').length;
        const buyLimit = allSignals.filter(s => s.trade_type === 'buy_limit').length;
        const sellOnly = allSignals.filter(s => s.trade_type === 'sell').length;
        const sellLimit = allSignals.filter(s => s.trade_type === 'sell_limit').length;
        const counts = {
          total: allSignals.length,
          active: allSignals.filter(s => ['active', 'pending', 'partially_profited'].includes(s.status)).length,
          closed: allSignals.filter(s => s.status === 'closed').length,
          buy: buyOnly + buyLimit,
          // Combined count
          sell: sellOnly + sellLimit,
          // Combined count
          buy_only: buyOnly,
          sell_only: sellOnly,
          buy_limit: buyLimit,
          sell_limit: sellLimit
        };
        setDatabaseCounts(counts);

        // Step 4: Build educator list with signal counts
        const educatorsList = educators.map(edu => {
          const signalCount = allSignals.filter(s => s.user_id === edu.id).length;
          return {
            id: edu.id,
            name: edu.display_name || 'Unknown Educator',
            signalCount
          };
        }).sort((a, b) => a.name.localeCompare(b.name));
        setAllEducatorsWithSignals(educatorsList);
        console.log('✅ Database counts:', counts);
        console.log('✅ Educators with signals:', educatorsList.length);
      } catch (error) {
        console.error('❌ Failed to fetch database counts:', error);
      }
    };

    // Initial fetch
    fetchDatabaseCounts();

    // Set up real-time subscription to refresh counts when signals change
    const channel = supabase.channel('signal_count_updates').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'trade_alerts'
    }, payload => {
      console.log('🔄 Signal changed, refreshing counts...', payload.eventType);
      fetchDatabaseCounts();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  useEffect(() => {
    const fetchStaticClosedAlerts = async () => {
      setIsLoadingClosedAlerts(true);
      try {
        console.log('📊 PHASE 6 + BUG #19: Fetching static closed alerts with loading state');

        // Get current educator IDs
        const {
          data: educators
        } = await supabase.from('profiles').select('id').or('user_type.eq.educator,access_level.eq.admin,access_level.eq.moderator,role.eq.admin');
        const educatorIds = educators?.map(e => e.id) || [];
        if (educatorIds.length === 0) {
          console.warn('No educators found, skipping closed alerts fetch');
          setIsLoadingClosedAlerts(false);
          return;
        }
        const {
          data: closedAlertsData,
          error
        } = await supabase.from('trade_alerts').select('*').eq('status', 'closed').in('user_id', educatorIds).order('updated_at', {
          ascending: false
        });
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

        // Fetch roles from user_roles table
        const {
          data: userRolesData
        } = await supabase.from('user_roles').select('user_id, role').in('user_id', userIds);

        // Create roles map with highest priority role per user
        const rolesMap = new Map<string, string>();
        const rolePriority: Record<string, number> = {
          admin: 4,
          'educator+': 3,
          moderator: 2,
          educator: 1
        };
        userRolesData?.forEach(ur => {
          const current = rolesMap.get(ur.user_id);
          if (!current || (rolePriority[ur.role] || 0) > (rolePriority[current] || 0)) {
            rolesMap.set(ur.user_id, ur.role);
          }
        });

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
              role: rolesMap.get(profile.id) || 'user',
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
        console.log(`📊 Loaded ALL ${mappedAlerts.length} closed alerts from ${educatorIds.length} educators (Total in DB: ${count})`);
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

  // ============================================
  // FILTERED SIGNALS: Combines active and closed, applies all filters, sorts by newest
  // ============================================
  const filteredSignals = useMemo(() => {
    if (!allAlerts.length && !staticClosedAlerts.length) {
      return {
        active: [],
        closed: [],
        closedTotal: 0
      };
    }

    // Combine active and closed alerts
    const allDisplayAlerts = [...allAlerts, ...staticClosedAlerts];

    // SignalRealtimeContext already filters signals by educators via RLS
    // No need to filter again here (was causing race condition)
    let filtered = allDisplayAlerts;

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(alert => alert.assetName.toLowerCase().includes(searchLower) || alert.tradermadeSymbol.toLowerCase().includes(searchLower) || alert.creator?.display_name?.toLowerCase().includes(searchLower));
    }

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(alert => alert.status === filters.status);
    }

    // Apply trade type filter (uses .includes() for combined filtering)
    if (filters.tradeType && filters.tradeType !== 'all') {
      filtered = filtered.filter(alert => alert.tradeType.includes(filters.tradeType));
    }

    // Apply educator filter - support multiple selected educators
    if (filters.selectedEducators && filters.selectedEducators.length > 0) {
      filtered = filtered.filter(alert => filters.selectedEducators.includes(alert.userId || '') || filters.selectedEducators.includes(alert.creator?.id || ''));
    } else if (filters.educator && filters.educator !== 'all') {
      filtered = filtered.filter(alert => alert.userId === filters.educator || alert.creator?.id === filters.educator);
    }

    // ✅ FIX: Split FIRST with deduplication to prevent duplicate keys during transitions
    const closedFiltered = filtered.filter(a => a.status === 'closed');
    const closedIds = new Set(closedFiltered.map(a => a.id));

    // Only include in active if NOT in closed (prevents duplicates during realtime transitions)
    const activeFiltered = filtered.filter(a => ['active', 'pending', 'partially_profited'].includes(a.status) && !closedIds.has(a.id));

    // Sort active alerts by creation time (newest first) - prevents jumping
    const sortedActive = activeFiltered.sort((a, b) => {
      const aDate = new Date(a.createdAt).getTime();
      const bDate = new Date(b.createdAt).getTime();
      return bDate - aDate; // Descending: newest created first
    });

    // Sort closed alerts by update time (newest closed first)
    const sortedClosed = closedFiltered.sort((a, b) => {
      const aDate = new Date(a.updatedAt).getTime();
      const bDate = new Date(b.updatedAt).getTime();
      return bDate - aDate; // Descending: newest closed first
    });

    // ✅ Store filtered count for display
    const filteredClosedCount = sortedClosed.length;

    // ✅ Apply UI limit of 12 for closed alerts display only
    const closedFilteredLimited = sortedClosed.slice(0, 12);
    console.log('🔍 Filter results:', {
      total: filtered.length,
      active: sortedActive.length,
      closedFiltered: filteredClosedCount,
      closedDisplayed: closedFilteredLimited.length,
      closedDatabaseTotal: totalClosedCount,
      // Database count (754)
      filters
    });
    return {
      active: sortedActive,
      closed: closedFilteredLimited,
      closedTotal: totalClosedCount // ✅ FIXED: Use database count
    };
  }, [allAlerts, staticClosedAlerts, filters, excludedSignalIds, totalClosedCount]);

  // ✅ DEBUG: Track signal flow through filter pipeline
  useEffect(() => {
    console.log('🔍 [Signal Flow Debug]', {
      allAlerts: allAlerts.length,
      staticClosed: staticClosedAlerts.length,
      activeFiltered: filteredSignals.active.length,
      closedFiltered: filteredSignals.closed.length,
      excludedCount: excludedSignalIds.size,
      filters: filters,
      firstActiveId: filteredSignals.active[0]?.id?.substring(0, 8) || 'none',
      activeStatuses: filteredSignals.active.slice(0, 3).map(a => `${a.assetName}:${a.status}`)
    });
  }, [allAlerts, staticClosedAlerts, filteredSignals, excludedSignalIds, filters]);

  // ✅ Track rendered IDs to prevent mid-render duplicates (rrweb race condition fix)
  const renderedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    // Update ref after each render completes (not during)
    renderedIdsRef.current = new Set([...filteredSignals.active.map(a => a.id), ...filteredSignals.closed.map(a => a.id)]);
  });

  // ✅ Render-safe filter: prevents duplicate keys even during React reconciliation
  const getSafeRenderList = useCallback((alerts: TradeAlertWithProfile[], listType: 'active' | 'closed') => {
    const seenIds = new Set<string>();
    return alerts.filter(alert => {
      // If we've already rendered this ID in THIS render cycle, skip it
      if (seenIds.has(alert.id)) {
        console.warn(`🚫 Prevented duplicate render of ${alert.id} in ${listType} list`);
        return false;
      }
      seenIds.add(alert.id);
      return true;
    });
  }, []);

  // ✅ SIMPLIFIED: React to state changes directly (no events, no tiers, no DB fetches)
  useEffect(() => {
    const alreadyClosedIds = new Set(staticClosedAlerts.map(a => a.id));
    const now = Date.now();
    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    const newlyClosedSignals = allAlerts.filter(signal => {
      if (signal.status !== 'closed') return false;
      if (alreadyClosedIds.has(signal.id)) return false;
      if (excludedSignalIds.has(signal.id)) return false;

      // ✅ NEW: Only treat as "new" if closed within last 5 minutes
      const closedTime = new Date(signal.updatedAt).getTime();
      const ageMs = now - closedTime;
      if (ageMs > FIVE_MINUTES_MS) {
        console.log(`⏭️ [OLD CLOSURE] Skipping toast for ${signal.assetName} (closed ${Math.round(ageMs / 60000)}m ago)`);
        return false;
      }
      return true;
    });
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

      // Show toast for each closed signal (with deduplication)
      newlyClosedSignals.forEach(signal => {
        // ✅ GUARD: Check if the instant path already showed a toast for this signal (SL or TP)
        const wasHandledByInstant = instantToastHandledRef.current.has(signal.id) ||
        // For SL hits
        Array.from(instantToastHandledRef.current).some(key => key.startsWith(`${signal.id}-tp`)); // For TP hits

        // ✅ SPECIAL CASE: Always allow "All Targets Hit!" toast through
        if (signal.closeReason === 'all_tps_hit') {
          // 🔒 Check if we've already shown this toast (persistent across navigation)
          const shownToasts = getShownAllTPToasts();
          if (shownToasts.has(signal.id)) {
            console.log(`⏭️ [TOAST ALREADY SHOWN] Skipping "All Targets Hit" for ${signal.id.substring(0, 8)} (previously shown this session)`);
            return; // Skip toast - already shown
          }
          console.log(`💰 [ALLOW] Showing "All Targets Hit" toast for ${signal.id.substring(0, 8)} (backend confirmed)`);

          // Mark as shown persistently
          markAllTPToastShown(signal.id);

          // Clear all instant detection flags since this is the final confirmation toast
          instantToastHandledRef.current.delete(signal.id);
          Array.from(instantToastHandledRef.current).forEach(key => {
            if (key.startsWith(`${signal.id}-tp`) || key.startsWith(`${signal.id}-sl`)) {
              instantToastHandledRef.current.delete(key);
            }
          });

          // Continue to show the toast (don't return early)
        } else if (wasHandledByInstant) {
          // For other close reasons (stop_loss, manual), skip if instant detection already handled it
          console.log(`⏭️ [SKIP TOAST] Signal ${signal.id.substring(0, 8)} already handled by instant detection (reason: ${signal.closeReason})`);

          // Clean up
          instantToastHandledRef.current.delete(signal.id);
          Array.from(instantToastHandledRef.current).forEach(key => {
            if (key.startsWith(`${signal.id}-tp`) || key.startsWith(`${signal.id}-sl`)) {
              instantToastHandledRef.current.delete(key);
            }
          });
          return; // Skip toast for non-"all_tps_hit" reasons
        }

        // If we are here, the closure was detected by the backend/realtime first
        let toastTitle = '🔒 Signal Closed';
        let toastDescription = `${signal.assetName} closed: ${signal.closeReason || 'Manual'}`;
        let toastVariant: 'default' | 'destructive' = 'default';
        if (signal.closeReason === 'stop_loss') {
          toastTitle = '🔴 Stop Loss Hit';
          toastDescription = `${signal.assetName} signal closed at SL`;
          toastVariant = 'destructive';
        } else if (signal.closeReason === 'all_tps_hit') {
          // Count total TPs for better context
          const totalTPs = [signal.tp1, signal.tp2, signal.tp3, signal.tp4, signal.tp5].filter(tp => tp && tp > 0).length;
          toastTitle = '💰 All Targets Hit!';
          toastDescription = `${signal.assetName} - All ${totalTPs} take profit${totalTPs > 1 ? 's' : ''} reached`;
        } else if (signal.closeReason?.startsWith('tp')) {
          toastTitle = '🟢 Take Profit Hit';
          const tpNum = signal.closeReason.replace('tp', '').replace('_hit', '');
          toastDescription = `${signal.assetName} closed at TP${tpNum}`;
        } else if (signal.closeReason === 'manual') {
          toastDescription = `${signal.assetName} closed manually`;
        }
        toast({
          title: toastTitle,
          description: toastDescription,
          variant: toastVariant
        });
      });
    }
  }, [allAlerts, staticClosedAlerts, excludedSignalIds, toast]);

  // ============================================
  // 🎯 FORTIFIED INSTANT TP & SL DETECTION (Phase 2)
  // 🚀 TIER 2: Debounced to reduce detection frequency
  // ============================================
  const detectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    // 🚀 TIER 2: Clear previous timeout
    if (detectionTimeoutRef.current) {
      clearTimeout(detectionTimeoutRef.current);
    }

    // 🚀 TIER 2: Debounce detection by 100ms
    detectionTimeoutRef.current = setTimeout(() => {
      const activeSignals = allAlerts.filter(s => s.status === 'active');
      if (activeSignals.length === 0) return;
      activeSignals.forEach(signal => {
        const priceData = prices[signal.tradermadeSymbol];
        if (!priceData) return;
        const isBuy = signal.tradeType === 'buy' || signal.tradeType === 'buy_limit';

        // --- TP DETECTION ---
        const tpLevels = [{
          level: 1,
          price: signal.tp1
        }, {
          level: 2,
          price: signal.tp2
        }, {
          level: 3,
          price: signal.tp3
        }, {
          level: 4,
          price: signal.tp4
        }, {
          level: 5,
          price: signal.tp5
        }];
        tpLevels.forEach(({
          level,
          price
        }) => {
          if (!price || price <= 0) return;
          const currentPrice = isBuy ? priceData.ask || priceData.price : priceData.bid || priceData.price;
          const tpHit = isBuy ? currentPrice >= price : currentPrice <= price;
          if (tpHit) {
            // 🔒 TIER 1: Atomic guard - combine all checks in one operation
            const tpKey = `${signal.id}-tp${level}`;

            // GUARD 1: Already hit in state
            if (signal.tpHits?.includes(level)) {
              return;
            }

            // GUARD 2: Already being processed
            if (processingSignalsRef.current.has(tpKey)) {
              return;
            }

            // GUARD 3: Backend already processed this
            if (backendProcessedRef.current.has(tpKey)) {
              console.log(`⏭️ [INSTANT] Backend already processed ${tpKey}`);
              return;
            }

            // All checks passed, proceed with immediate lock
            console.log(`🎯 [INSTANT TP HIT] Signal ${signal.id.substring(0, 8)} TP${level}`);

            // 🔒 IMMEDIATE LOCK: Mark as processing (atomic - no race condition gap)
            processingSignalsRef.current.add(tpKey);
            instantToastHandledRef.current.add(tpKey);

            // Optimistic UI Update
            const updatedTPHits = [...(signal.tpHits || []), level].sort((a, b) => a - b);

            // 🆕 COUNT TOTAL DEFINED TPs
            const totalTPs = [signal.tp1, signal.tp2, signal.tp3, signal.tp4, signal.tp5].filter(tp => tp && tp > 0).length;

            // 🆕 CHECK IF ALL TPs ARE NOW HIT
            const allTPsHit = updatedTPHits.length === totalTPs && totalTPs > 0;

            // 🆕 PREPARE UPDATE DATA
            const updateData = allTPsHit ? {
              tpHits: updatedTPHits,
              status: 'closed' as const,
              closeReason: 'all_tps_hit' as const
            } : {
              tpHits: updatedTPHits
            };

            // ✅ Only optimistically update tpHits (visual feedback without list movement)
            if (!allTPsHit) {
              optimisticallyUpdateSignal(signal.id, {
                tpHits: updatedTPHits
              });
            }

            // Backend handles status change, realtime updates UI smoothly
            updateAlert(signal.id, updateData);

            // ✅ ALWAYS show individual TP notification only
            // The "All Targets Hit!" toast will come from the state watcher
            const remainingTPs = totalTPs - updatedTPHits.length;
            toast({
              title: `🎯 TP${level} Hit!`,
              description: allTPsHit ? `${signal.assetName} reached final TP${level} - Signal closing` : `${signal.assetName} reached TP${level} - ${remainingTPs} TPs remaining`
            });

            // 🚀 NEW: Instant modern notification for TP hits
            // ⚠️ ONLY show individual TP notification if NOT all TPs are hit
            if ((window as any).addNotification && !allTPsHit) {
              // Calculate pips for this specific TP
              const tpPrice = signal[`tp${level}` as keyof typeof signal] as number;
              const pipsData = calculatePipsForSignal(signal.entryPrice, tpPrice, signal.tradermadeSymbol, signal.tradeType);
              (window as any).addNotification({
                id: `tp-hit-${signal.id}-${level}-${Date.now()}`,
                type: 'tp_hit',
                title: `🎯 TP${level} Hit!`,
                message: `TP${level} HIT on ${signal.assetName} at $${tpPrice.toFixed(2)} | ${pipsData.formatted.toUpperCase()} - ${remainingTPs} TPs remaining`,
                metadata: {
                  signal_id: signal.id,
                  provider_name: signal.creator?.display_name || 'Educator',
                  provider_avatar_url: signal.creator?.avatar_url,
                  provider_type: signal.creator?.user_type || 'educator',
                  asset_name: signal.assetName,
                  tp_hits: updatedTPHits,
                  total_tps: totalTPs,
                  triggered_price: tpPrice,
                  pips_data: {
                    value: pipsData.value,
                    formatted: pipsData.formatted,
                    direction: pipsData.direction
                  }
                },
                timestamp: new Date(),
                priority: 4
              });
              console.log(`🔔 [INSTANT] Modern notification for TP${level} hit (${pipsData.formatted})`);
            }

            // 🆕 BACKEND CONFIRMATION WITH AUTO-CLOSE
            supabase.from('trade_alerts').update(allTPsHit ? {
              tp_hits: updatedTPHits,
              status: 'closed',
              close_reason: 'all_tps_hit'
            } : {
              tp_hits: updatedTPHits
            }).eq('id', signal.id).then(() => {
              // 🔓 UNLOCK: Always remove from processing
              processingSignalsRef.current.delete(tpKey);

              // 🎉 NEW: Celebration notification for all TPs hit
              if (allTPsHit && (window as any).addNotification) {
                // Calculate pips for the final TP (highest TP that exists)
                const finalTpLevel = Math.max(...updatedTPHits);
                const finalTpPrice = signal[`tp${finalTpLevel}` as keyof typeof signal] as number;
                const pipsData = calculatePipsForSignal(signal.entryPrice, finalTpPrice, signal.tradermadeSymbol, signal.tradeType);
                (window as any).addNotification({
                  id: `all-tps-${signal.id}-${Date.now()}`,
                  type: 'trade_closed',
                  title: '🎉 ALL TPs HIT!',
                  message: `${signal.assetName} completed all ${totalTPs} take profits successfully | ${pipsData.formatted.toUpperCase()}`,
                  metadata: {
                    signal_id: signal.id,
                    provider_name: signal.creator?.display_name || 'Educator',
                    provider_avatar_url: signal.creator?.avatar_url,
                    provider_type: signal.creator?.user_type || 'educator',
                    asset_name: signal.assetName,
                    tp_hits: updatedTPHits,
                    total_tps: totalTPs,
                    progress_percentage: 100,
                    triggered_price: finalTpPrice,
                    pips_data: {
                      value: pipsData.value,
                      formatted: pipsData.formatted,
                      direction: pipsData.direction
                    }
                  },
                  timestamp: new Date(),
                  priority: 5
                });
                console.log(`🎉 [CELEBRATION] All TPs hit notification sent with ${pipsData.formatted}`);
              }
            });
          }
        });

        // --- SL DETECTION ---
        const slPrice = signal.stopLoss;
        if (slPrice && slPrice > 0) {
          const slCheckPrice = isBuy ? priceData.bid || priceData.price : priceData.ask || priceData.price;
          const slHit = isBuy ? slCheckPrice <= slPrice : slCheckPrice >= slPrice;
          if (slHit) {
            // 🔒 TIER 1: Atomic guard - combine all checks in one operation
            const slKey = `${signal.id}-sl`;

            // GUARD 1: Already closed in state
            if (signal.status === 'closed') {
              return;
            }

            // GUARD 2: Already being processed
            if (processingSignalsRef.current.has(slKey)) {
              return;
            }

            // GUARD 3: Backend already processed this
            if (backendProcessedRef.current.has(slKey)) {
              console.log(`⏭️ [INSTANT] Backend already processed ${slKey}`);
              return;
            }

            // All checks passed, proceed with immediate lock
            console.log(`🛑 [INSTANT SL HIT] Signal ${signal.id.substring(0, 8)}`);

            // 🔒 IMMEDIATE LOCK: Mark as processing (atomic - no race condition gap)
            processingSignalsRef.current.add(slKey);
            instantToastHandledRef.current.add(signal.id);

            // Show Toast
            toast({
              title: '🛑 Stop Loss Hit!',
              description: `${signal.assetName} hit Stop Loss.`,
              variant: 'destructive'
            });

            // Backend Confirmation (non-blocking)
            supabase.rpc('close_trade_alert', {
              p_alert_id: signal.id,
              p_user_id: user?.id,
              p_close_reason: 'stop_loss'
            }).then(({
              error
            }) => {
              if (error) {
                console.error(`❌ Backend SL closure failed:`, error);
                toast({
                  title: '❌ SL Closure Failed',
                  description: 'Could not confirm stop loss. Please try closing manually.',
                  variant: 'destructive'
                });
              }

              // 🔓 UNLOCK: Always remove from processing
              processingSignalsRef.current.delete(slKey);
            });
          }
        }
      });
    }, 50); // 🚀 OPTIMIZED: 50ms debounce for instant TP detection

    return () => {
      // 🚀 TIER 2: Cleanup timeout on unmount
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current);
      }
    };
  }, [prices, allAlerts, user?.id, toast, updateAlert]);

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
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
      console.log('✅ [SignalStream] Scrolled to top for new signal');

      // 🚀 NEW: Show instant modern notification with sound
      if ((window as any).addNotification) {
        const isBuy = newSignal.tradeType === 'buy' || newSignal.tradeType === 'buy_limit';
        (window as any).addNotification({
          id: `signal-created-${newSignal.id}-${Date.now()}`,
          type: 'new_signal',
          title: '🎯 New Signal Created',
          message: `${newSignal.assetName} ${isBuy ? 'BUY' : 'SELL'} signal is now live`,
          metadata: {
            signal_id: newSignal.id,
            provider_name: profile?.display_name || user?.email || 'You',
            provider_type: profile?.access_level || 'educator',
            asset_name: newSignal.assetName,
            tp_hits: [],
            total_tps: [newSignal.tp1, newSignal.tp2, newSignal.tp3, newSignal.tp4, newSignal.tp5].filter(Boolean).length
          },
          timestamp: new Date(),
          priority: 3
        });
        console.log('🔔 [INSTANT] Modern notification triggered for new signal');
        console.log('🔍 [DEBUG] Notification payload:', {
          id: `signal-created-${newSignal.id}-${Date.now()}`,
          type: 'new_signal',
          provider_name: profile?.display_name || user?.email || 'You',
          has_window_fn: typeof (window as any).addNotification === 'function'
        });
      }

      // Show toast notification
      toast({
        title: '🎯 New Signal Added',
        description: `${newSignal.assetName || 'Signal'} is now live in Active Alerts`
      });
    };
    window.addEventListener('signal-created-confirmed', handleNewSignalCreated as EventListener);
    return () => {
      window.removeEventListener('signal-created-confirmed', handleNewSignalCreated as EventListener);
    };
  }, [toast, profile, user]);
  const sortedClosedAlerts = useMemo(() => {
    // PHASE 6: Use static closed alerts instead of real-time filtered ones
    return staticClosedAlerts;
  }, [staticClosedAlerts]);

  // Check if we have pending limit orders for the monitor
  const hasPendingLimitOrders = useMemo(() => {
    return filteredSignals.active.some(alert => alert.status === 'pending' && (alert.tradeType === 'buy_limit' || alert.tradeType === 'sell_limit'));
  }, [filteredSignals.active]);

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
    [...filteredSignals.active, ...alerts.filter(a => a.status === 'pending')].forEach(alert => {
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
  }, [filteredSignals.active, alerts]);

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
    if (!user?.id || !profile) {
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
      const result = await tradingApiService.createAlert(createDto, user.id);
      if (result.success && result.data) {
        // ✅ OPTIMISTIC UPDATE: Transform response to Signal format
        const newSignal: any = {
          id: result.data.id,
          asset_name: result.data.assetName,
          tradermade_symbol: result.data.tradermadeSymbol,
          direction: result.data.tradeType === 'buy' || result.data.tradeType === 'buy_limit' ? 'BUY' : 'SELL',
          entry_price: result.data.entryPrice,
          stop_loss: result.data.stopLoss,
          take_profit_1: result.data.tp1,
          take_profit_2: result.data.tp2,
          take_profit_3: result.data.tp3,
          take_profit_4: result.data.tp4,
          take_profit_5: result.data.tp5,
          tp_hits: result.data.tpHits || [],
          status: result.data.status,
          notes: result.data.notes,
          user_id: result.data.userId,
          created_at: result.data.createdAt,
          updated_at: result.data.updatedAt,
          creator: {
            id: profile.id,
            display_name: profile.display_name ?? 'You',
            role: profile.role ?? 'user',
            user_type: profile.user_type,
            access_level: profile.access_level
          }
        };

        // ✅ Add signal optimistically via Context (transform camelCase to TradeAlertWithProfile format)
        optimisticallyAddSignal({
          id: result.data.id,
          userId: result.data.userId,
          assetName: result.data.assetName,
          tradermadeSymbol: result.data.tradermadeSymbol,
          tradeType: result.data.tradeType,
          entryPrice: result.data.entryPrice,
          stopLoss: result.data.stopLoss,
          status: result.data.status,
          tp1: result.data.tp1,
          tp2: result.data.tp2,
          tp3: result.data.tp3,
          tp4: result.data.tp4,
          tp5: result.data.tp5,
          tpHits: result.data.tpHits || [],
          notes: result.data.notes,
          closeReason: result.data.closeReason,
          createdAt: result.data.createdAt,
          updatedAt: result.data.updatedAt,
          creator: {
            id: profile.id,
            display_name: profile.display_name ?? 'You',
            role: profile.role ?? 'user',
            avatar_url: (profile as any).avatar_url,
            user_type: profile.user_type,
            access_level: profile.access_level
          }
        });
        toast({
          title: "⚡ Signal Created Instantly!",
          description: `${data.asset_name} ${data.trade_type.replace('_', ' ').toUpperCase()} educational analysis has been posted.`
        });
        setShowCreateModal(false);
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
      case 'polling-fallback':
        return <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
            <Wifi className="w-3 h-3 mr-1" />
            Live (Polling)
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
        const {
          data,
          error
        } = await supabase.rpc('close_trade_alert', {
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
      allTPs: {
        tp1: alert.tp1,
        tp2: alert.tp2,
        tp3: alert.tp3,
        tp4: alert.tp4,
        tp5: alert.tp5
      }
    });
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
              message: `${alert.assetName} reached Take Profit ${highestTP}`,
              signalId: alert.id,
              assetName: alert.assetName,
              timestamp: new Date()
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
            message: `${alert.assetName} trade closed at stop loss`,
            signalId: alert.id,
            assetName: alert.assetName,
            timestamp: new Date()
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
    const alertIsCreator = isCreator(alert);
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

      // Dispatch event for toast notification
      window.dispatchEvent(new CustomEvent('order-activation-confirmed', {
        detail: {
          signalId: alert.id,
          assetName: alert.assetName,
          entryPrice: alert.entryPrice,
          tradeType: alert.tradeType,
          timestamp: new Date().toISOString()
        }
      }));
      if (result && (window as any).addNotification) {
        (window as any).addNotification({
          type: 'trade_activated',
          title: `🚀 Order Activated!`,
          message: `${alert.assetName} ${alert.tradeType} is now active`,
          signalId: alert.id,
          assetName: alert.assetName,
          timestamp: new Date()
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
      <div className="fixed inset-0 overflow-hidden bg-black z-40">
        
        {/* Content wrapper with z-index */}
        <div className="relative z-50 h-full overflow-y-auto">
          <GlobalLeadershipBanner />
        
        {/* Header - Mobile Optimized spacing */}
        


          {/* Main Content - Mobile Optimized grid layout with granular protection */}
          <div className="w-full px-2 sm:px-4 pt-0 pb-24 md:pb-6">
            <div className="max-w-none w-full">
              <div className="w-full">
              
              {/* System Status - Removed for clean UI */}
              
              


              <div className="mb-6" />
              
              {/* Enhanced Filters - Protected from widget opening */}
              <div data-prevent-widget-open="true" className="flex items-center gap-3">
                <div className="flex-1">
                  <SignalStreamFilters filters={filters} onFiltersChange={setFilters} educatorOptions={educatorMetadata.educatorOptions} signalCounts={educatorMetadata.signalCounts} canCreateSignals={canCreateSignals} onCreateSignal={() => setShowCreateModal(true)} />
                </div>
                {isDevToolsEnabled() && <PriceRefreshButton symbols={symbols} className="shrink-0" />}
                {isDevToolsEnabled() && <Button onClick={handleManualSync} disabled={isSyncing} variant="outline" size="sm" className="gap-2 shrink-0" title="Force refresh all signals from database">
                    {isSyncing ? <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Syncing...</span>
                      </> : <>
                        <RefreshCw className="w-4 h-4" />
                        <span>Force Sync</span>
                      </>}
                  </Button>}
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
                    <h2 className="text-base font-bold pb-2 mb-4 flex items-center gap-2" style={{
                      borderBottom: `2px solid ${colors.border.default}`,
                      color: colors.text.primary
                    }}>
                      <span>Active Alerts</span>
                      <span className="text-xs px-2 py-0.5 rounded-lg font-semibold ml-auto" style={{
                        background: colors.state.active,
                        color: colors.text.accent,
                        border: `1px solid ${colors.border.active}`
                      }}>
                        {filteredSignals.active.length}
                      </span>
                      </h2>
                       {filteredSignals.active.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" style={{
                      background: 'transparent'
                    }}>
                         {getSafeRenderList(filteredSignals.active, 'active').map(alert => <TradeAlertCard key={alert.id} alert={{
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
                      }} onStatusUpdate={handleStatusUpdate} onTakeProfitHit={handleTakeProfitHit} onStopLossHit={handleStopLossHit} onOrderActivation={handleOrderActivation} isAdmin={isAdmin} isCreator={isCreator(alert)} livePrice={livePrices[alert.tradermadeSymbol] || livePrices[alert.assetName.toUpperCase()]} connectionStatus={priceConnectionStatus as 'connecting' | 'connected' | 'error'} priceSource={priceSource} isRecentClosure={false} creator={alert.creator} justAdded={justAddedIds.has(alert.id)} />)}
                      </div> : <div className="text-center py-8">
                        <TrendlineEmptyState />
                        <h3 className="text-xl font-semibold text-foreground mb-2">No Active Educational Patterns</h3>
                        <p className="text-muted-foreground">New educational analysis patterns will appear here when posted by educational contributors.</p>
                      </div>}
                  </div>
                  
                  <div>
                    <h2 className="text-base font-bold pb-2 mb-4 flex items-center gap-2" style={{
                      borderBottom: `2px solid ${colors.border.default}`,
                      color: colors.text.primary
                    }}>
                      <span>Closed Alerts</span>
                      <span className="text-xs px-2 py-0.5 rounded-lg font-semibold ml-auto" style={{
                        background: colors.state.active,
                        color: colors.text.accent,
                        border: `1px solid ${colors.border.active}`
                      }}>
                        {filters.educator || filters.status || filters.tradeType || filters.search ? filteredSignals.closedTotal : educatorSpecificCounts.closed}
                      </span>
                    </h2>
                    {isLoadingClosedAlerts ?
                    // ✅ BUG FIX #19: Skeleton UI for closed alerts loading
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {Array.from({
                        length: 6
                      }).map((_, i) => <div key={i} className="rounded-lg p-4 animate-pulse" style={{
                        background: '#1C1C1E',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                            <div className="h-4 w-1/3 rounded mb-3" style={{
                          background: 'rgba(255, 255, 255, 0.08)'
                        }} />
                            <div className="h-6 w-2/3 rounded mb-4" style={{
                          background: 'rgba(255, 255, 255, 0.08)'
                        }} />
                            <div className="h-24 w-full rounded" style={{
                          background: 'rgba(255, 255, 255, 0.08)'
                        }} />
                          </div>)}
                       </div> : filteredSignals.closed.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" style={{
                      background: 'transparent'
                    }}>
                         {getSafeRenderList(filteredSignals.closed, 'closed').map(alert => <TradeAlertCard key={alert.id} alert={{
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
                      }} onStatusUpdate={handleStatusUpdate} onTakeProfitHit={handleTakeProfitHit} onStopLossHit={handleStopLossHit} onOrderActivation={handleOrderActivation} isAdmin={isAdmin} isCreator={isCreator(alert)} livePrice={undefined} connectionStatus={priceConnectionStatus as 'connecting' | 'connected' | 'error'} priceSource={priceSource} isRecentClosure={true} creator={alert.creator} />)}
                      </div> : <div className="text-center py-8">
                        <MagnifyingSearchEmptyState />
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
            <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-3 sm:p-6" style={{
              background: 'rgba(28, 28, 30, 0.7)',
              backdropFilter: 'blur(30px) saturate(180%)',
              WebkitBackdropFilter: 'blur(30px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              
              <OptimizedNewAlertForm onSubmit={handleCreateSignal} onCancel={() => setShowCreateModal(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </StreamErrorBoundary>
  </SignalStreamErrorBoundary>;
}