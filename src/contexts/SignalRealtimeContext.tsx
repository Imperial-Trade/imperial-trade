import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { unstable_batchedUpdates } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { TradeAlertWithProfile } from '@/api/services/TradingApiService';
import { useSharedRealtime } from './SharedRealtimeContext';
import { useRealtimeHealth } from './RealtimeHealthMonitor';
import { useRealtimeGate } from '@/hooks/useRouteGatedSubscriptions';
import { useTelemetry } from '@/contexts/TelemetryContext';
import { isDevToolsEnabled } from '@/utils/featureFlags';
import { useRealtimeTelemetry } from '@/hooks/useRealtimeTelemetry';
import { realtimeLogger, generateChannelId } from '@/utils/realtimeLogger';
import { signalCacheManager } from '@/utils/signalCacheManager';

// PHASE 1: Normalized State Management - Cost savings and atomic updates
let educatorUserIdsCache: string[] = [];
let educatorCacheExpiry = 0;
const EDUCATOR_CACHE_TTL = 15 * 60 * 1000; // 15 minutes cache
const LOCAL_CACHE_TTL = 5 * 60 * 1000; // 5 minute cache
const SIGNAL_REFRESH_THROTTLE = 30000; // 30 seconds throttle

// PHASE 6: Production reliability configuration
const CONNECTION_CONFIG = {
  maxConsecutiveFailures: 5,
  breakerOpenDuration: 30000, // 30 seconds
  maxReconnectAttempts: 10,
  baseRetryDelay: 2000, // Start with 2 seconds
  maxRetryDelay: 30000, // Cap at 30 seconds
  retryMultiplier: 1.8, // Gentle exponential backoff
  jitterRange: 0.3, // ±30% jitter
  heartbeatInterval: 30000, // 30 second heartbeat
  pollingFallbackInterval: 10000, // 10 second polling when real-time fails
  healthCheckInterval: 60000, // 1 minute health check
};

// PHASE 6: Connection state interface for production reliability
interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error' | 'circuit-breaker' | 'polling-fallback';
  attempt: number;
  nextRetryAt: number | null;
  errorCount: number;
  lastSuccessAt: number | null;
  consecutiveFailures: number;
  isPollingMode: boolean;
  lastHeartbeatAt: number | null;
}

async function getEducatorUserIds(): Promise<string[]> {
  const now = Date.now();
  
  // Return cached IDs if still valid
  if (educatorUserIdsCache.length > 0 && now < educatorCacheExpiry) {
    return educatorUserIdsCache;
  }

  try {
    const { data: educators, error } = await supabase
      .from('profiles')
      .select('id')
      .or('access_level.eq.admin,access_level.eq.moderator,user_type.eq.educator');

    if (error) throw error;

    educatorUserIdsCache = educators?.map(e => e.id) || [];
    educatorCacheExpiry = now + EDUCATOR_CACHE_TTL;
    
    console.log(`📊 Cached ${educatorUserIdsCache.length} educator user IDs`);
    return educatorUserIdsCache;
  } catch (error) {
    console.error('❌ Failed to fetch educator user IDs:', error);
    return educatorUserIdsCache; // Return stale cache if available
  }
}

interface SignalRealtimeContextType {
  signals: TradeAlertWithProfile[]; // PHASE 1: Convert Record to Array for UI compatibility
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' | 'polling-fallback';
  lastUpdated: Date | null;
  error: string | null;
  nextRetryAt: number | null;
  subscribe: () => void;
  unsubscribe: () => void;
  refreshSignals: () => Promise<void>;
  // PHASE 6: Enhanced reliability methods
  restartConnection: () => void;
  getConnectionHealth: () => { isHealthy: boolean; lastUpdate: Date | null; mode: string };
  forcePollingMode: () => void;
  isInPollingMode: boolean;
}

const SignalRealtimeContext = createContext<SignalRealtimeContextType | null>(null);

interface SignalRealtimeProviderProps {
  children: React.ReactNode;
}

export const SignalRealtimeProvider: React.FC<SignalRealtimeProviderProps> = ({ children }) => {
  // 🔥 LEAK-PROOF: Deterministic channel ID for definitive logging
  const channelIdRef = useRef(generateChannelId('signal'));
  
  // PHASE 1: CRITICAL - Normalized state management using Record for atomic updates
  const [signals, setSignals] = useState<Record<string, TradeAlertWithProfile>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nextRetryAt, setNextRetryAt] = useState<number | null>(null);
  const mountOnlyRef = useRef(false); // 🔥 LEAK-PROOF: Prevent operations after unmount

  // PHASE 6: Enhanced connection state management for production reliability
  const connectionStateRef = useRef<ConnectionState>({
    status: 'disconnected',
    attempt: 0,
    nextRetryAt: null,
    errorCount: 0,
    lastSuccessAt: null,
    consecutiveFailures: 0,
    isPollingMode: false,
    lastHeartbeatAt: null,
  });
  
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error' | 'polling-fallback'>('disconnected');
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // PHASE 3: Use shared Realtime connection to eliminate duplicate channels + HEALTH MONITORING
  const { connectionState, subscribeToTable } = useSharedRealtime();
  const healthMonitor = useRealtimeHealth();
  const { recordMessage, recordConnection } = useRealtimeTelemetry();
  const telemetry = useTelemetry();
  
  // PHASE B: Route gating for signal subscriptions
  const isSignalSubscriptionAllowed = useRealtimeGate('signals');
  
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshRef = useRef<number>(0);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isThrottled = useRef<boolean>(false);
  
  // PHASE 1: Enhanced local caching with normalized map
  const localCacheRef = useRef<{ 
    signals: Record<string, TradeAlertWithProfile>, 
    signalsLastFetch: number,
    educatorIds: string[],
    educatorIdsLastFetch: number 
  }>({ signals: {}, signalsLastFetch: 0, educatorIds: [], educatorIdsLastFetch: 0 });

  const refreshSignals = useCallback(async () => {
    if (isThrottled.current) {
      console.log('refreshSignals - Request throttled, skipping');
      return;
    }

    try {
      setError(null);
      console.log('refreshSignals - Starting refresh with educator filter');

      // Get cached educator IDs or fetch fresh ones
      let educatorIds = localCacheRef.current.educatorIds;
      const cacheAge = Date.now() - localCacheRef.current.educatorIdsLastFetch;
      
      if (!educatorIds || educatorIds.length === 0 || cacheAge > EDUCATOR_CACHE_TTL) {
        console.log('refreshSignals - Fetching fresh educator IDs (cache expired or empty)');
        educatorIds = await getEducatorUserIds();
        localCacheRef.current.educatorIds = educatorIds;
        localCacheRef.current.educatorIdsLastFetch = Date.now();
      }

      if (!educatorIds || educatorIds.length === 0) {
        console.log('refreshSignals - No educators found, setting empty signals');
        setSignals({});
        setLastUpdated(new Date());
        return;
      }

      console.log('refreshSignals - Fetching signals for educators:', educatorIds.length);

      // Set throttle
      isThrottled.current = true;
      setTimeout(() => {
        isThrottled.current = false;
      }, SIGNAL_REFRESH_THROTTLE);

      // Use simpler query to avoid relation issues
      const { data: signalsData, error: signalsError } = await supabase
        .from('trade_alerts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(100);

      if (signalsError) {
        console.error('refreshSignals - Supabase error:', signalsError);
        throw new Error(`Failed to fetch signals: ${signalsError.message}`);
      }

      if (!signalsData) {
        console.log('refreshSignals - No signals data returned');
        setSignals({});
        setLastUpdated(new Date());
        return;
      }

      // Fetch profile data separately
      const userIds = [...new Set(signalsData.map(s => s.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name, role, avatar_url, user_type, access_level')
        .in('id', userIds);

      // Create profile lookup
      const profileLookup = (profilesData || []).reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, any>);

      // Transform to normalized state map
      const signalsMap: Record<string, TradeAlertWithProfile> = {};
      signalsData.forEach(signal => {
        const transformedSignal: TradeAlertWithProfile = {
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
          creator: profileLookup[signal.user_id] ? {
            id: profileLookup[signal.user_id].id,
            display_name: profileLookup[signal.user_id].display_name || 'Anonymous User',
            role: profileLookup[signal.user_id].role || 'user',
            avatar_url: profileLookup[signal.user_id].avatar_url,
            user_type: profileLookup[signal.user_id].user_type,
            access_level: profileLookup[signal.user_id].access_level
          } : {
            id: signal.user_id,
            display_name: 'Unknown User',
            role: 'user',
            avatar_url: null,
            user_type: null,
            access_level: null
          }
        };

        signalsMap[signal.id] = transformedSignal;
      });

      console.log('refreshSignals - Successfully loaded signals:', {
        total: Object.keys(signalsMap).length,
        activeCount: Object.values(signalsMap).filter(s => s.status === 'active').length,
        pendingCount: Object.values(signalsMap).filter(s => s.status === 'pending').length,
        closedCount: Object.values(signalsMap).filter(s => s.status === 'closed').length
      });

      setSignals(signalsMap);
      setLastUpdated(new Date());

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('refreshSignals - Error:', errorMessage);
      setError(errorMessage);
      
      // Fallback to empty state on error
      setSignals({});
    }
  }, []);

  // PHASE 6: Connection state management utilities
  const updateConnectionState = useCallback((updates: Partial<ConnectionState>) => {
    connectionStateRef.current = { ...connectionStateRef.current, ...updates };
    const newStatus = connectionStateRef.current.status === 'circuit-breaker' ? 'error' : connectionStateRef.current.status;
    setConnectionStatus(newStatus);
  }, []);

  const isCircuitBreakerOpen = useCallback(() => {
    const state = connectionStateRef.current;
    return state.status === 'circuit-breaker' || 
           (state.consecutiveFailures >= CONNECTION_CONFIG.maxConsecutiveFailures &&
            Date.now() < (state.nextRetryAt || 0));
  }, []);

  const calculateRetryDelay = useCallback((attempt: number): number => {
    const baseDelay = Math.min(
      CONNECTION_CONFIG.baseRetryDelay * Math.pow(CONNECTION_CONFIG.retryMultiplier, attempt),
      CONNECTION_CONFIG.maxRetryDelay
    );
    
    const jitter = baseDelay * CONNECTION_CONFIG.jitterRange * (Math.random() - 0.5);
    return Math.max(baseDelay + jitter, 1000); // Minimum 1 second
  }, []);

  // PHASE 6: Enhanced reliability methods
  const restartConnection = useCallback(() => {
    console.log('🔄 SignalRealtime: Manual connection restart requested');
    unsubscribe();
    setTimeout(() => subscribe(), 1000);
  }, []);

  const getConnectionHealth = useCallback(() => {
    const state = connectionStateRef.current;
    const now = Date.now();
    const isHealthy = state.status === 'connected' && 
                     state.lastSuccessAt && 
                     (now - state.lastSuccessAt) < CONNECTION_CONFIG.healthCheckInterval;
    
    return {
      isHealthy,
      lastUpdate: lastUpdated,
      mode: state.isPollingMode ? 'polling' : 'realtime'
    };
  }, [lastUpdated]);

  const forcePollingMode = useCallback(() => {
    console.log('🔄 SignalRealtime: Forcing polling mode');
    connectionStateRef.current.isPollingMode = true;
    setConnectionStatus('polling-fallback');
    
    // Start polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    pollingIntervalRef.current = setInterval(() => {
      if (mountOnlyRef.current && !isCircuitBreakerOpen()) {
        refreshSignals();
      }
    }, CONNECTION_CONFIG.pollingFallbackInterval);
  }, [refreshSignals, isCircuitBreakerOpen]);

  const isInPollingMode = connectionStateRef.current.isPollingMode;

  // PHASE 1 & 2: ATOMIC UPDATE HANDLER - Normalized state management with instant updates
  const handleRealtimeUpdate = useCallback(async (payload: any) => {
    const signalId = payload?.new?.id || payload?.old?.id;
    
    if (isDevToolsEnabled()) {
      console.log('🔄 SignalRealtime event:', {
        type: payload.eventType,
        signalId,
        timestamp: new Date().toISOString()
      });
    }
    
    healthMonitor.recordRealtimeMessage('SignalRealtime', payload.eventType || 'unknown');
    telemetry.record('signal_change_v3');

    try {
      // Handle DELETE operations - ATOMIC removal from normalized state
      if (payload.eventType === 'DELETE' && payload.old?.id) {
        console.log('handleRealtimeUpdate - Processing DELETE for signal:', payload.old.id);
        
        setSignals(prev => {
          const { [payload.old.id]: deletedSignal, ...remaining } = prev;
          return remaining;
        });
        
        console.log('handleRealtimeUpdate - Signal deleted from state:', payload.old.id);
        return;
      }

      // Extract and validate the signal data
      const signalData = payload.new || payload.record;
      if (!signalData?.id) {
        console.warn('handleRealtimeUpdate - No valid signal data found in payload:', payload);
        return;
      }

      console.log('handleRealtimeUpdate - Processing signal update:', {
        signalId: signalData.id,
        status: signalData.status,
        asset: signalData.asset_name,
        eventType: payload.eventType
      });

      // Get educator profile data for the signal
      let profileData = null;
      if (signalData.user_id) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, display_name, role, avatar_url, user_type, access_level')
            .eq('id', signalData.user_id)
            .single();
          
          profileData = profile;
        } catch (profileError) {
          console.warn('handleRealtimeUpdate - Could not fetch profile for user:', signalData.user_id);
        }
      }

      // Create the complete signal object
      const signalWithProfile: TradeAlertWithProfile = {
        id: signalData.id,
        userId: signalData.user_id,
        assetName: signalData.asset_name,
        tradermadeSymbol: signalData.tradermade_symbol,
        tradeType: signalData.trade_type,
        entryPrice: Number(signalData.entry_price),
        stopLoss: Number(signalData.stop_loss),
        status: signalData.status,
        tp1: signalData.tp1 ? Number(signalData.tp1) : undefined,
        tp2: signalData.tp2 ? Number(signalData.tp2) : undefined,
        tp3: signalData.tp3 ? Number(signalData.tp3) : undefined,
        tp4: signalData.tp4 ? Number(signalData.tp4) : undefined,
        tp5: signalData.tp5 ? Number(signalData.tp5) : undefined,
        tpHits: signalData.tp_hits || [],
        notes: signalData.notes,
        closeReason: signalData.close_reason,
        createdAt: signalData.created_at,
        updatedAt: signalData.updated_at,
        creator: profileData
      };

      // PHASE 1: ATOMIC STATE UPDATE - Direct Record operation for instant synchronization
      setSignals(prev => ({
        ...prev,
        [signalData.id]: signalWithProfile
      }));

      setLastUpdated(new Date());

      console.log('handleRealtimeUpdate - Successfully processed signal update:', {
        signalId: signalData.id,
        eventType: payload.eventType
      });

    } catch (error) {
      console.error('handleRealtimeUpdate - Error processing update:', error);
      setError(error instanceof Error ? error.message : 'Failed to process signal update');
    }
  }, [healthMonitor, telemetry]);

  // Subscription management
  const subscribe = useCallback(() => {
    if (!isSignalSubscriptionAllowed || unsubscribeRef.current) {
      console.log('SignalRealtime - Subscription blocked or already active');
      return;
    }

    console.log('SignalRealtime - Starting subscription');
    setConnectionStatus('connecting');

    const unsubscribeFn = subscribeToTable(
      'trade_alerts',
      handleRealtimeUpdate,
      {
        channelId: channelIdRef.current,
        onConnectionChange: (status: string) => {
          setConnectionStatus(status as any);
          if (status === 'connected') {
            connectionStateRef.current.lastSuccessAt = Date.now();
            connectionStateRef.current.consecutiveFailures = 0;
            // Refresh data on connection
            refreshSignals();
          }
        }
      }
    );

    unsubscribeRef.current = unsubscribeFn;
    mountOnlyRef.current = true;

    // Initial data fetch
    refreshSignals();
  }, [isSignalSubscriptionAllowed, subscribeToTable, handleRealtimeUpdate, refreshSignals]);

  const unsubscribe = useCallback(() => {
    console.log('SignalRealtime - Cleaning up subscription');
    
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    mountOnlyRef.current = false;
    setConnectionStatus('disconnected');
    
    // Clear timers
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);

  // PHASE 1: Convert normalized state Record to Array for UI compatibility
  const contextValue: SignalRealtimeContextType = {
    signals: Object.values(signals || {}),
    connectionStatus,
    lastUpdated,
    error,
    nextRetryAt,
    subscribe,
    unsubscribe,
    refreshSignals,
    restartConnection,
    getConnectionHealth,
    forcePollingMode,
    isInPollingMode
  };

  return (
    <SignalRealtimeContext.Provider value={contextValue}>
      {children}
    </SignalRealtimeContext.Provider>
  );
};

export const useSignalRealtime = (): SignalRealtimeContextType => {
  const context = useContext(SignalRealtimeContext);
  if (!context) {
    throw new Error('useSignalRealtime must be used within a SignalRealtimeProvider');
  }
  return context;
};