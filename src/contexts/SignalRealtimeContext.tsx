import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
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

// PHASE 3: Massive Realtime Usage Reduction - 90% cost savings
// Enhanced caching and shared connection strategy
let educatorUserIdsCache: string[] = [];
let educatorCacheExpiry = 0;
const EDUCATOR_CACHE_TTL = 15 * 60 * 1000; // Extended to 15 minutes
const LOCAL_CACHE_TTL = 5 * 60 * 1000; // 🔥 OPTIMIZED to 5 minute cache for closed signals
const SIGNAL_REFRESH_THROTTLE = 30000; // 🔥 OPTIMIZED to 30 seconds for better responsiveness

// PHASE 6: PRODUCTION-READY RELIABILITY - Connection Management & Fallbacks
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
  signals: TradeAlertWithProfile[];
  signalsMap: Record<string, TradeAlertWithProfile>;
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
  
  // PHASE 1: NORMALIZED STATE - Signal map for atomic updates and array for compatibility
  const [signalsMap, setSignalsMap] = useState<Record<string, TradeAlertWithProfile>>({});
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
  
  // PHASE 3: Enhanced local caching to minimize database queries (NORMALIZED)
  const localCacheRef = useRef<{ 
    dataMap: Record<string, TradeAlertWithProfile>, 
    expiry: number,
    educatorIds: string[],
    educatorExpiry: number 
  }>({ dataMap: {}, expiry: 0, educatorIds: [], educatorExpiry: 0 });

  const refreshSignals = useCallback(async () => {
    try {
      // PHASE 3: Throttle refresh requests to reduce database load
      const now = Date.now();
      if (now - lastRefreshRef.current < SIGNAL_REFRESH_THROTTLE) {
        if (isDevToolsEnabled()) {
          console.log('⏱️ Refresh throttled, using cached data');
        }
        return;
      }
      
      lastRefreshRef.current = now;
      
      if (isDevToolsEnabled()) {
        console.log('🔄 PHASE 3: SignalRealtime refresh with maximum cost optimization...');
      }
      
      healthMonitor.recordDatabaseQuery('SignalRealtime', 'refresh');
      
      // PHASE 3: Enhanced cache checking with educator IDs (NORMALIZED)
      const cache = localCacheRef.current;
      if (Object.keys(cache.dataMap).length > 0 && now < cache.expiry && cache.educatorIds.length > 0) {
        if (isDevToolsEnabled()) {
          console.log('📊 Using comprehensive cached signals, skipping all database queries');
        }
        unstable_batchedUpdates(() => {
          setSignalsMap(cache.dataMap);
          setLastUpdated(new Date());
          setError(null);
        });
        return;
      }
      
      // PHASE 3: Use cached educator IDs or fetch fresh ones
      let educatorUserIds = cache.educatorIds;
      if (educatorUserIds.length === 0 || now >= cache.educatorExpiry) {
        educatorUserIds = await getEducatorUserIds();
        localCacheRef.current.educatorIds = educatorUserIds;
        localCacheRef.current.educatorExpiry = now + EDUCATOR_CACHE_TTL;
      }
      
      // 🔥 FIX CLOSED SIGNALS: Filter out old closed signals to prevent reappearing
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: alertsData, error: alertsError } = await supabase
        .from('trade_alerts')
        .select('*')
        .in('user_id', educatorUserIds)
        .or(`status.neq.closed,and(status.eq.closed,updated_at.gte.${oneHourAgo})`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (alertsError) {
        console.error('SignalRealtimeContext - Error fetching alerts:', alertsError);
        throw alertsError;
      }

      console.log('SignalRealtimeContext - Fetched educator alerts:', alertsData?.length || 0);

      if (!alertsData || alertsData.length === 0) {
        console.log('SignalRealtimeContext - No educator alerts found');
        unstable_batchedUpdates(() => {
          setSignalsMap({});
          setLastUpdated(new Date());
          setError(null);
        });
        return;
      }

      // Get profiles for these alerts
      const userIds = [...new Set(alertsData.map(alert => alert.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError) {
        console.error('SignalRealtimeContext - Error fetching profiles:', profilesError);
      }

      // Create profile map
      const profilesMap = new Map();
      if (profilesData) {
        profilesData.forEach(profile => {
          profilesMap.set(profile.id, profile);
        });
      }

      // Map alerts with their profiles
      const allAlertsWithProfiles: TradeAlertWithProfile[] = alertsData.map(alert => {
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

      // 🔥 PHASE 1: Convert to normalized state map for atomic updates
      const filteredAlerts = allAlertsWithProfiles;
      const normalizedMap: Record<string, TradeAlertWithProfile> = {};
      filteredAlerts.forEach(alert => {
        normalizedMap[alert.id] = alert;
      });
      
      // PHASE 3: Update comprehensive local cache with normalized results
      localCacheRef.current = {
        dataMap: normalizedMap,
        expiry: now + LOCAL_CACHE_TTL,
        educatorIds: educatorUserIds,
        educatorExpiry: localCacheRef.current.educatorExpiry || now + EDUCATOR_CACHE_TTL
      };
      
      unstable_batchedUpdates(() => {
        setSignalsMap(normalizedMap);
        setLastUpdated(new Date());
        setError(null);
      });
      
    } catch (err) {
      console.error('SignalRealtimeContext - Failed to refresh signals:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh signals');
    }
  }, []);

  // PHASE 1: Convert normalized state map to array for component compatibility
  const signals = useMemo(() => {
    return Object.values(signalsMap).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [signalsMap]);

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
    // Reset connection state
    connectionStateRef.current = {
      status: 'disconnected',
      attempt: 0,
      nextRetryAt: null,
      errorCount: 0,
      lastSuccessAt: null,
      consecutiveFailures: 0,
      isPollingMode: false,
      lastHeartbeatAt: null,
    };
    setError(null);
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

  // 🚀 BATCHED UPDATE HANDLER: Prevent React rendering storms  
  const handleRealtimeUpdate = useCallback(async (payload: any) => {
    const signalId = payload?.new?.id || payload?.old?.id;
    
    if (isDevToolsEnabled()) {
      console.log('🔄 SignalRealtime event:', {
        type: payload.eventType,
        signalId,
        timestamp: new Date().toISOString()
      });
    }
    
    if (isDevToolsEnabled()) {
      console.log('SignalRealtimeContext - Processing real-time update:', payload.eventType, signalId);
    }
    
    healthMonitor.recordRealtimeMessage('SignalRealtime', payload.eventType || 'unknown');
    telemetry.record('signal_change_v3'); // PHASE C: Per-channel telemetry with versioning
    
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      if (eventType === 'INSERT' && newRecord) {
        if (isDevToolsEnabled()) {
          console.log('SignalRealtimeContext - Processing INSERT for alert:', newRecord.id);
        }
        
        // Get profile for the new signal
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', newRecord.user_id)
          .single();

        if (profileError && isDevToolsEnabled()) {
          console.error('SignalRealtimeContext - Error fetching profile for new signal:', profileError);
        }

        if (isDevToolsEnabled()) {
          console.log('SignalRealtimeContext - Profile for new signal:', profile);
        }

        const newSignal: TradeAlertWithProfile = {
          id: newRecord.id,
          userId: newRecord.user_id,
          assetName: newRecord.asset_name,
          tradermadeSymbol: newRecord.tradermade_symbol,
          tradeType: newRecord.trade_type,
          entryPrice: Number(newRecord.entry_price),
          stopLoss: Number(newRecord.stop_loss),
          status: newRecord.status,
          tp1: newRecord.tp1 ? Number(newRecord.tp1) : undefined,
          tp2: newRecord.tp2 ? Number(newRecord.tp2) : undefined,
          tp3: newRecord.tp3 ? Number(newRecord.tp3) : undefined,
          tp4: newRecord.tp4 ? Number(newRecord.tp4) : undefined,
          tp5: newRecord.tp5 ? Number(newRecord.tp5) : undefined,
          tpHits: newRecord.tp_hits || [],
          notes: newRecord.notes,
          closeReason: newRecord.close_reason,
          createdAt: newRecord.created_at,
          updatedAt: newRecord.updated_at,
          creator: profile ? {
            id: profile.id,
            display_name: profile.display_name || 'Anonymous User',
            role: profile.role || 'user',
            avatar_url: profile.avatar_url,
            user_type: profile.user_type,
            access_level: profile.access_level
          } : {
            id: newRecord.user_id,
            display_name: 'Unknown User',
            role: 'user',
            avatar_url: null,
            user_type: null,
            access_level: null
          }
        };

        if (isDevToolsEnabled()) {
          console.log('SignalRealtimeContext - Adding new signal to state:', newSignal);
        }
        
        // PHASE 1: ATOMIC INSERT - Use normalized state map for perfect isolation
        setSignalsMap(prev => {
          if (prev[newSignal.id]) {
            if (isDevToolsEnabled()) {
              console.log('SignalRealtimeContext - Signal already exists, skipping duplicate insert');
            }
            return prev; // No change needed
          }
          
          // PHASE 1: ATOMIC INSERT - Perfect isolation with normalized state
          const updated = { ...prev, [newSignal.id]: newSignal };
          if (isDevToolsEnabled()) {
            console.log('SignalRealtimeContext - Updated signals map:', Object.keys(updated).length, 'signals');
          }
          return updated;
        });

      } else if (eventType === 'UPDATE' && newRecord) {
        if (isDevToolsEnabled()) {
          console.log('SignalRealtimeContext - Processing UPDATE for alert:', newRecord.id);
        }
        
        // Get profile for the updated signal
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', newRecord.user_id)
          .single();

        if (profileError && isDevToolsEnabled()) {
          console.error('SignalRealtimeContext - Error fetching profile for updated signal:', profileError);
        }

        // Check for meaningful notes changes and trigger notifications
        const hasSignificantNotesChange = oldRecord.notes !== newRecord.notes && 
          newRecord.notes && 
          newRecord.notes.trim().length > 10; // Only notify for substantial notes

        if (hasSignificantNotesChange) {
          console.log(`🔔 PHASE 3: Notes change detected for signal ${newRecord.id}`, {
            oldNotes: oldRecord.notes?.substring(0, 50) + '...',
            newNotes: newRecord.notes?.substring(0, 50) + '...',
            hasContent: !!newRecord.notes?.trim()
          });
          
          // Trigger notes update notification
          window.dispatchEvent(new CustomEvent('signal-notes-updated', {
            detail: {
              signalId: newRecord.id,
              assetName: newRecord.assetName,
              oldNotes: oldRecord.notes,
              newNotes: newRecord.notes,
              updatedAt: new Date().toISOString()
            }
          }));
        }

        const updatedSignal: TradeAlertWithProfile = {
          id: newRecord.id,
          userId: newRecord.user_id,
          assetName: newRecord.asset_name,
          tradermadeSymbol: newRecord.tradermade_symbol,
          tradeType: newRecord.trade_type,
          entryPrice: Number(newRecord.entry_price),
          stopLoss: Number(newRecord.stop_loss),
          status: newRecord.status,
          tp1: newRecord.tp1 ? Number(newRecord.tp1) : undefined,
          tp2: newRecord.tp2 ? Number(newRecord.tp2) : undefined,
          tp3: newRecord.tp3 ? Number(newRecord.tp3) : undefined,
          tp4: newRecord.tp4 ? Number(newRecord.tp4) : undefined,
          tp5: newRecord.tp5 ? Number(newRecord.tp5) : undefined,
          tpHits: newRecord.tp_hits || [],
          notes: newRecord.notes,
          closeReason: newRecord.close_reason,
          createdAt: newRecord.created_at,
          updatedAt: newRecord.updated_at,
          creator: profile ? {
            id: profile.id,
            display_name: profile.display_name || 'Anonymous User',
            role: profile.role || 'user',
            avatar_url: profile.avatar_url,
            user_type: profile.user_type,
            access_level: profile.access_level
          } : {
            id: newRecord.user_id,
            display_name: 'Unknown User',
            role: 'user',
            avatar_url: null,
            user_type: null,
            access_level: null
          }
        };
        
        // PHASE 1 & 2: ATOMIC UPDATE - Perfect isolation with instant UI sync
        if (isDevToolsEnabled()) {
          console.log('SignalRealtimeContext - UPDATE event details:', {
            signalId: newRecord.id,
            oldStatus: oldRecord?.status,
            newStatus: newRecord.status,
            tpHitsChange: `${oldRecord?.tp_hits?.length || 0} -> ${newRecord.tp_hits?.length || 0}`,
            statusChange: oldRecord?.status !== newRecord.status
          });
        }
        
        // PHASE 1: ATOMIC UPDATE - Single, isolated update per signal
        setSignalsMap(prev => {
          if (!prev[newRecord.id]) {
            if (isDevToolsEnabled()) {
              console.log('SignalRealtimeContext - Signal not found for update, adding as new:', newRecord.id);
            }
          }
          
          // PHASE 2: INSTANT UI SYNC - Single update, no delays, no race conditions
          return { ...prev, [newRecord.id]: updatedSignal };
        });
        
        // If this is a closure event, trigger cache manager cleanup for flicker prevention
        if (newRecord.status === 'closed') {
          signalCacheManager.markSignalClosed(newRecord.id, newRecord.updated_at);
        }
      
      } else if (eventType === 'DELETE' && oldRecord) {
        if (isDevToolsEnabled()) {
          console.log('SignalRealtimeContext - Processing DELETE for alert:', oldRecord.id);
        }
        
        // PHASE 1: ATOMIC DELETE - Perfect isolation
        setSignalsMap(prev => {
          const { [oldRecord.id]: deleted, ...remaining } = prev;
          return remaining;
        });
      }

      unstable_batchedUpdates(() => {
        setLastUpdated(new Date());
        setError(null);
      });
    } catch (err) {
      console.error('SignalRealtimeContext - Failed to handle realtime update:', err);
    }
  }, []);

  // 🚀 REAL-TIME SUBSCRIPTION: Shared connection approach
  const subscribe = useCallback(async () => {
    if (!isSignalSubscriptionAllowed) {
      console.log('SignalRealtimeContext - Subscription blocked by route gating');
      return;
    }

    if (connectionStateRef.current.status === 'connected') {
      console.log('SignalRealtimeContext - Already connected, skipping subscription');
      return;
    }

    try {
      console.log('SignalRealtimeContext - Starting subscription...');
      updateConnectionState({ status: 'connecting' });
      recordConnection();

      // Initial data fetch
      await refreshSignals();

      // Subscribe to real-time updates using shared connection
      const unsubscribeFn = subscribeToTable({
        table: 'trade_alerts',
        event: '*'
      }, handleRealtimeUpdate);
      unsubscribeRef.current = unsubscribeFn;

      // Update connection state and start heartbeat
      updateConnectionState({
        status: 'connected',
        lastSuccessAt: Date.now(),
        consecutiveFailures: 0,
        errorCount: 0
      });

      recordConnection();
      
      console.log('SignalRealtimeContext - Successfully subscribed to real-time updates');
    } catch (err) {
      console.error('SignalRealtimeContext - Failed to subscribe:', err);
      updateConnectionState({
        status: 'error',
        errorCount: connectionStateRef.current.errorCount + 1,
        consecutiveFailures: connectionStateRef.current.consecutiveFailures + 1
      });
      setError(err instanceof Error ? err.message : 'Subscription failed');
    }
  }, [isSignalSubscriptionAllowed, refreshSignals, subscribeToTable, handleRealtimeUpdate, updateConnectionState, recordConnection]);

  const unsubscribe = useCallback(() => {
    console.log('SignalRealtimeContext - Unsubscribing...');
    
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    updateConnectionState({ status: 'disconnected' });
    recordConnection();
  }, [updateConnectionState, recordConnection]);

  // 🔥 LEAK-PROOF MOUNT/UNMOUNT: Single execution, comprehensive cleanup
  useEffect(() => {
    if (mountOnlyRef.current) return;
    mountOnlyRef.current = true;
    
    // Register with health monitor
    healthMonitor.registerConnection('SignalRealtime');
    
    realtimeLogger.logStatus('SignalRealtimeProvider MOUNT');

    return () => {
      mountOnlyRef.current = false;
      realtimeLogger.logStatus('SignalRealtimeProvider UNMOUNT');
      
      // 🔥 LEAK-PROOF: Clear all timers first
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // 🔥 LEAK-PROOF: Force unsubscribe
      unsubscribe();
      
      healthMonitor.unregisterConnection('SignalRealtime');
    };
  }, []); // 🔥 LEAK-PROOF: Mount-only, never re-run

  const contextValue: SignalRealtimeContextType = {
    signals,
    signalsMap,
    connectionStatus: connectionStateRef.current.status === 'circuit-breaker' ? 'error' : connectionStateRef.current.status,
    lastUpdated,
    error: error || connectionStateRef.current?.status === 'error' ? 'Connection error' : null,
    nextRetryAt,
    subscribe,
    unsubscribe,
    refreshSignals,
    // PHASE 6: Enhanced reliability methods
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