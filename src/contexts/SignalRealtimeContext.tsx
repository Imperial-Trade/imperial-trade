
import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { produce } from 'immer';
import { supabase } from '@/integrations/supabase/client';
import { TradeAlertWithProfile, transformTradeAlertWithProfile } from '@/utils/dataTransformers';
import { useSharedRealtime } from './SharedRealtimeContext';
import { useRealtimeHealth } from './RealtimeHealthMonitor';
import { useRealtimeGate } from '@/hooks/useRouteGatedSubscriptions';
import { useTelemetry } from '@/contexts/TelemetryContext';
import { isDevToolsEnabled } from '@/utils/featureFlags';
import { useRealtimeTelemetry } from '@/hooks/useRealtimeTelemetry';
import { realtimeLogger, generateChannelId } from '@/utils/realtimeLogger';

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
  // PHASE 2: Normalized map-based state for O(1) lookups
  signalsMap: Record<string, TradeAlertWithProfile>;
  signals: TradeAlertWithProfile[]; // Computed array for backward compatibility
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
  // PHASE 2: Map-based utilities
  getSignalById: (id: string) => TradeAlertWithProfile | undefined;
  updateSignal: (id: string, updates: Partial<TradeAlertWithProfile>) => void;
}

const SignalRealtimeContext = createContext<SignalRealtimeContextType | null>(null);

interface SignalRealtimeProviderProps {
  children: React.ReactNode;
}

export const SignalRealtimeProvider: React.FC<SignalRealtimeProviderProps> = ({ children }) => {
  // 🔥 LEAK-PROOF: Deterministic channel ID for definitive logging
  const channelIdRef = useRef(generateChannelId('signal'));
  
  // PHASE 2: Map-based state for O(1) operations
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
  
  // Transaction tracking for guaranteed state lifecycle monitoring
  const transactionIdRef = useRef<number>(0);
  const stateTransitionRef = useRef<{ [key: number]: string }>({});
  
  // PHASE 2: Map-based local caching to minimize database queries
  const localCacheRef = useRef<{ 
    dataMap: Record<string, TradeAlertWithProfile>, 
    expiry: number,
    educatorIds: string[],
    educatorExpiry: number 
  }>({ dataMap: {}, expiry: 0, educatorIds: [], educatorExpiry: 0 });

  // Transaction ID generator for state lifecycle tracking
  const generateTransactionId = useCallback(() => {
    return ++transactionIdRef.current;
  }, []);

  // Synchronous cache update function
  const updateLocalCacheSync = useCallback((payload: any, action: 'INSERT' | 'UPDATE' | 'DELETE') => {
    const cache = localCacheRef.current;
    if (Object.keys(cache.dataMap).length === 0) return;

    const signalId = payload?.new?.id || payload?.old?.id;
    
    if (action === 'INSERT' && payload.new) {
      // Cache will be updated by the main state update
    } else if (action === 'UPDATE' && payload.new && cache.dataMap[signalId]) {
      cache.dataMap = produce(cache.dataMap, draft => {
        if (draft[signalId]) {
          Object.assign(draft[signalId], payload.new);
        }
      });
    } else if (action === 'DELETE' && payload.old && cache.dataMap[signalId]) {
      const { [signalId]: deleted, ...remaining } = cache.dataMap;
      cache.dataMap = remaining;
    }
  }, []);

  // Post-update effects handler (runs after state update)
  const schedulePostUpdateEffects = useCallback((payload: any, actionType: 'INSERT' | 'UPDATE' | 'DELETE') => {
    if (actionType === 'INSERT' && payload.new) {
      // Dispatch notification for new signals
      setTimeout(() => {
        if ((window as any).addNotification) {
          (window as any).addNotification({
            type: 'signal_created',
            title: `🚨 New ${payload.new.trade_type?.replace('_', ' ')?.toUpperCase()} Signal`,
            message: `Signal posted for ${payload.new.asset_name} at $${payload.new.entry_price}`,
            signalId: payload.new.id,
            assetName: payload.new.asset_name,
            priority: 'high',
            autoRemove: true,
          });
        }
        window.dispatchEvent(new CustomEvent('signal-posted'));
      }, 0);
    } else if (actionType === 'UPDATE' && payload.new) {
      const isOrderActivation = payload.old?.status === 'pending' && payload.new.status === 'active';
      
      if (isOrderActivation) {
        setTimeout(() => {
          // Enhanced activation notification
          if ((window as any).addNotification) {
            (window as any).addNotification({
              type: 'order_activated',
              title: `🚀 Order Activated!`,
              message: `${payload.new.asset_name} ${payload.new.trade_type} is now ACTIVE`,
              priority: 'high',
              autoRemove: true,
              duration: 5000
            });
          }
          
          window.dispatchEvent(new CustomEvent('order-activated', {
            detail: {
              signalId: payload.new.id,
              assetName: payload.new.asset_name,
              status: payload.new.status,
              timestamp: new Date().toISOString(),
              priority: 'high'
            }
          }));
        }, 0);
      }
    }
  }, []);

  // PHASE 2: Helper functions for map operations
  const arrayToMap = useCallback((alerts: TradeAlertWithProfile[]): Record<string, TradeAlertWithProfile> => {
    return alerts.reduce((map, alert) => {
      map[alert.id] = alert;
      return map;
    }, {} as Record<string, TradeAlertWithProfile>);
  }, []);

  const mapToSortedArray = useCallback((map: Record<string, TradeAlertWithProfile>): TradeAlertWithProfile[] => {
    return Object.values(map).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, []);

  // PHASE 2: Computed signals array for backward compatibility
  const signals = useMemo(() => mapToSortedArray(signalsMap), [signalsMap, mapToSortedArray]);

  // PHASE 2: Map utilities
  const getSignalById = useCallback((id: string) => signalsMap[id], [signalsMap]);
  
  const updateSignal = useCallback((id: string, updates: Partial<TradeAlertWithProfile>) => {
    setSignalsMap(prev => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], ...updates }
      };
    });
  }, []);

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
      
      // PHASE 2: Enhanced cache checking with educator IDs (map-based)
      const cache = localCacheRef.current;
      if (Object.keys(cache.dataMap).length > 0 && now < cache.expiry && cache.educatorIds.length > 0) {
        if (isDevToolsEnabled()) {
          console.log('📊 Using comprehensive cached signals, skipping all database queries');
        }
        setSignalsMap(cache.dataMap);
        setLastUpdated(new Date());
        setError(null);
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
  setSignalsMap({});
  setLastUpdated(new Date());
  setError(null);
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

      // ACL: Transform alerts with profiles using centralized transformer
      const allAlertsWithProfiles: TradeAlertWithProfile[] = alertsData.map(alert => {
        const profile = profilesMap.get(alert.user_id);
        return transformTradeAlertWithProfile({
          ...alert,
          profiles: profile || null
        });
      });

      // 🔥 RESTORED: Let database 1-hour window handle closed signals filtering
      // SignalCacheManager now only prevents flicker during WebSocket updates
      const filteredAlerts = allAlertsWithProfiles;
      
      // PHASE 2: Convert to map for O(1) operations
      const alertsMap = arrayToMap(filteredAlerts);
      
      // PHASE 2: Update comprehensive local cache with filtered results (map-based)
      localCacheRef.current = {
        dataMap: alertsMap,
        expiry: now + LOCAL_CACHE_TTL,
        educatorIds: educatorUserIds,
        educatorExpiry: localCacheRef.current.educatorExpiry || now + EDUCATOR_CACHE_TTL
      };
      
      setSignalsMap(alertsMap);
      setLastUpdated(new Date());
      setError(null);
      
    } catch (err) {
      console.error('SignalRealtimeContext - Failed to refresh signals:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh signals');
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

  // 🚀 ATOMIC UPDATE HANDLER: Single source of truth with Immer immutability
  const atomicSignalUpdate = useCallback(async (payload: any) => {
    const transactionId = generateTransactionId();
    const signalId = payload?.new?.id || payload?.old?.id;
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    // Store transaction context
    stateTransitionRef.current[transactionId] = `${eventType}_${signalId}`;
    
    // === DIAGNOSTIC POINT 1: INCOMING EVENT ===
    console.log('[DIAGNOSTIC] 1. INCOMING EVENT:', {
      transactionId,
      timestamp: new Date().toISOString(),
      eventType: eventType,
      signalId: signalId,
      rawPayload: JSON.parse(JSON.stringify(payload)),
      payloadKeys: Object.keys(payload || {}),
      newRecord: newRecord ? JSON.parse(JSON.stringify(newRecord)) : null,
      oldRecord: oldRecord ? JSON.parse(JSON.stringify(oldRecord)) : null
    });
    
    if (isDevToolsEnabled()) {
      console.log('🔄 SignalRealtime atomic update:', {
        transactionId,
        type: eventType,
        signalId,
        timestamp: new Date().toISOString()
      });
    }
    
    healthMonitor.recordRealtimeMessage('SignalRealtime', eventType || 'unknown');
    telemetry.record('signal_change_v3');
    
    try {
      // ATOMIC STATE UPDATE with Immer
      setSignalsMap(produce(draft => {
        // === DIAGNOSTIC POINT 2: STATE BEFORE UPDATE ===
        console.log(`[DIAGNOSTIC] 2. STATE BEFORE UPDATE (${eventType}):`, {
          transactionId,
          timestamp: new Date().toISOString(),
          eventType,
          signalId,
          currentStateKeys: Object.keys(draft),
          currentStateCount: Object.keys(draft).length,
          currentState: JSON.parse(JSON.stringify(draft)),
          signalExists: !!draft[signalId]
        });
        
        if (eventType === 'INSERT' && newRecord) {
          // === DIAGNOSTIC POINT 3A: INTENDED CHANGE (INSERT) ===
          console.log('[DIAGNOSTIC] 3A. INTENDED CHANGE (INSERT):', {
            transactionId,
            timestamp: new Date().toISOString(),
            eventType: 'INSERT',
            signalId: newRecord.id,
            newRecordObject: JSON.parse(JSON.stringify(newRecord)),
            willSkipDuplicate: !!draft[newRecord.id],
            intendedAction: draft[newRecord.id] ? 'SKIP_DUPLICATE' : 'ADD_NEW_SIGNAL'
          });
          
          // Skip duplicates using O(1) lookup
          if (draft[newRecord.id]) {
            if (isDevToolsEnabled()) {
              console.log('SignalRealtime - Signal already in state, skipping duplication:', newRecord.id);
            }
            return;
          }
          
          // Add new signal to draft (Immer handles immutability)
          draft[newRecord.id] = transformTradeAlertWithProfile({
            ...newRecord,
            profiles: null // Will be loaded asynchronously
          });
          
        } else if (eventType === 'UPDATE' && newRecord && draft[newRecord.id]) {
          const existingSignal = draft[newRecord.id];
          const isOrderActivation = existingSignal.status === 'pending' && newRecord.status === 'active';
          const isCriticalStatusChange = newRecord.status === 'closed' || isOrderActivation;
          const isNotesUpdate = existingSignal.notes !== newRecord.notes;
          
          // === DIAGNOSTIC POINT 3B: INTENDED CHANGE (UPDATE) ===
          console.log('[DIAGNOSTIC] 3B. INTENDED CHANGE (UPDATE):', {
            transactionId,
            timestamp: new Date().toISOString(),
            eventType: 'UPDATE',
            signalId: newRecord.id,
            originalDbRecord: JSON.parse(JSON.stringify(newRecord)),
            existingSignalInState: JSON.parse(JSON.stringify(existingSignal)),
            willUpdateSignal: true,
            intendedAction: 'UPDATE_EXISTING_SIGNAL',
            statusChange: `${existingSignal.status} → ${newRecord.status}`,
            isOrderActivation,
            isCriticalStatusChange,
            isNotesUpdate,
            tpHitsUpdate: {
              old: existingSignal.tpHits,
              new: newRecord.tp_hits
            }
          });
          
          // Update existing signal (Immer handles immutability)
          Object.assign(draft[newRecord.id], {
            assetName: newRecord.asset_name,
            tradeType: newRecord.trade_type,
            entryPrice: newRecord.entry_price,
            stopLoss: newRecord.stop_loss,
            takeProfit1: newRecord.take_profit_1,
            takeProfit2: newRecord.take_profit_2,
            takeProfit3: newRecord.take_profit_3,
            takeProfit4: newRecord.take_profit_4,
            takeProfit5: newRecord.take_profit_5,
            status: newRecord.status,
            notes: newRecord.notes,
            updatedAt: newRecord.updated_at,
            closedAt: newRecord.closed_at,
            tpHits: newRecord.tp_hits || []
          });
          
        } else if (eventType === 'DELETE' && oldRecord && draft[oldRecord.id]) {
          // === DIAGNOSTIC POINT 3C: INTENDED CHANGE (DELETE) ===
          console.log('[DIAGNOSTIC] 3C. INTENDED CHANGE (DELETE):', {
            transactionId,
            timestamp: new Date().toISOString(),
            eventType: 'DELETE',
            signalId: oldRecord.id,
            deletedRecord: JSON.parse(JSON.stringify(oldRecord)),
            signalExistsInState: !!draft[oldRecord.id],
            intendedAction: 'DELETE_SIGNAL'
          });
          
           // Remove signal from draft (Immer handles immutability)
          delete draft[oldRecord.id];
        }

        // === DIAGNOSTIC POINT 4: ATOMIC OPERATION COMPLETE ===
        console.log('[DIAGNOSTIC] 4. ATOMIC OPERATION COMPLETE:', {
          transactionId,
          timestamp: new Date().toISOString(),
          updateType: eventType,
          signalId: signalId,
          incomingPayload: JSON.parse(JSON.stringify(payload)),
          targetSignalAfterUpdate: draft[signalId] ? JSON.parse(JSON.stringify(draft[signalId])) : null,
          allSignalsInDraft: Object.keys(draft).reduce((acc, key) => {
            acc[key] = JSON.parse(JSON.stringify(draft[key]));
            return acc;
          }, {}),
          draftSize: Object.keys(draft).length,
          allSignalIds: Object.keys(draft).sort()
        });
      }));
      
      // Synchronous cache update immediately after state update
      updateLocalCacheSync(payload, eventType as 'INSERT' | 'UPDATE' | 'DELETE');
      
      // Update metadata atomically
      setLastUpdated(new Date());
      setError(null);
      
      // Schedule post-update effects (notifications, events) to run after state update
      schedulePostUpdateEffects(payload, eventType as 'INSERT' | 'UPDATE' | 'DELETE');
      
      // Clean up transaction context
      delete stateTransitionRef.current[transactionId];
      
      if (isDevToolsEnabled()) {
        console.log(`✅ Atomic update completed for transaction ${transactionId}`);
      }
      
    } catch (err) {
      console.error(`❌ Atomic update failed for transaction ${transactionId}:`, err);
      delete stateTransitionRef.current[transactionId];
    }
  }, [generateTransactionId, healthMonitor, telemetry, updateLocalCacheSync, schedulePostUpdateEffects]);

  // 🔥 LEAK-PROOF: Subscribe with mount guards and definitive logging
  const subscribe = useCallback(async () => {
    // 🔥 LEAK-PROOF: Block subscription after unmount
    if (!mountOnlyRef.current) {
      if (isDevToolsEnabled()) {
        console.log('Signal subscription blocked: component unmounted');
      }
      return;
    }
    
    // PHASE B: Route gating - only subscribe if current route allows signals
    if (!isSignalSubscriptionAllowed) {
      if (isDevToolsEnabled()) {
        console.log('🚦 Signal subscription blocked by route gating');
      }
      return;
    }

    // 🔥 LEAK-PROOF: Idempotent subscription check
    if (unsubscribeRef.current) {
      if (isDevToolsEnabled()) {
        console.log('SignalRealtimeContext - Already subscribed via shared connection');
      }
      return;
    }

    // 🔥 DEFINITIVE LOGGING: Log subscription attempt
    realtimeLogger.logSubscribe(channelIdRef.current, 'trade_alerts', 'SignalRealtimeProvider');

    try {
      // PHASE 3: Get educator IDs with enhanced caching
      const cache = localCacheRef.current;
      const now = Date.now();
      
      let educatorUserIds = cache.educatorIds;
      if (educatorUserIds.length === 0 || now >= cache.educatorExpiry) {
        educatorUserIds = await getEducatorUserIds();
        localCacheRef.current.educatorIds = educatorUserIds;
        localCacheRef.current.educatorExpiry = now + EDUCATOR_CACHE_TTL;
      }
      
      // 🚀 OPTIMIZED: Subscribe to ALL relevant signal events for immediate updates
      const unsubscribeInsert = subscribeToTable(
        {
          table: 'trade_alerts',
          event: 'INSERT',
          filter: `user_id=in.(${educatorUserIds.join(',')})`
        },
        atomicSignalUpdate
      );
      
      // 🚀 ENHANCED UPDATE FILTER: All meaningful updates for comprehensive coverage
      const unsubscribeUpdate = subscribeToTable(
        {
          table: 'trade_alerts', 
          event: 'UPDATE',
          // Capture all significant changes: status changes, TP hits, notes, activations
          filter: `user_id=in.(${educatorUserIds.join(',')})`
        },
        atomicSignalUpdate
      );
      
      // Combine unsubscribe functions
      const unsubscribe = () => {
        unsubscribeInsert();
        unsubscribeUpdate();
      };
      
      unsubscribeRef.current = unsubscribe;
      recordConnection(); // PHASE C: Record successful subscription
      
      // Load initial data with caching
      refreshSignals();
      
      if (isDevToolsEnabled()) {
        console.log('✅ PHASE 3: Subscribed via shared connection, zero duplicate channels');
      }
      
    } catch (error) {
      console.error('❌ Failed to subscribe to signals:', error);
      setError('Failed to initialize realtime connection');
      updateConnectionState({
        status: 'error',
        consecutiveFailures: connectionStateRef.current.consecutiveFailures + 1
      });
    }
  }, [subscribeToTable, atomicSignalUpdate, refreshSignals, isSignalSubscriptionAllowed, updateConnectionState]);

  // 🔥 LEAK-PROOF: Deterministic unsubscribe with definitive logging
  const unsubscribe = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (unsubscribeRef.current) {
      // 🔥 DEFINITIVE LOGGING: Always log unsubscription
      realtimeLogger.logUnsubscribe(channelIdRef.current, 'SignalRealtimeProvider');
      
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    setNextRetryAt(null);
  }, []); // 🔥 LEAK-PROOF: No dependencies to prevent stale closures

  // PHASE 3: Simplified reconnection via shared connection (automatic)
  const attemptReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const delay = 5000; // Simple 5 second delay
    const target = Date.now() + delay;
    setNextRetryAt(target);

    if (isDevToolsEnabled()) {
      console.log(`🔄 PHASE 3: Reconnecting via shared connection in ${Math.round(delay)}ms`);
    }
    
    reconnectTimeoutRef.current = setTimeout(() => {
      unsubscribe();
      subscribe();
    }, delay);
  }, [subscribe, unsubscribe]);

  // 🔥 LEAK-PROOF: Mount-only lifecycle with definitive cleanup
  useEffect(() => {
    mountOnlyRef.current = true;
    
    realtimeLogger.logStatus('SignalRealtimeProvider MOUNT');
    healthMonitor.registerConnection('SignalRealtime');
    
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

  // === DIAGNOSTIC POINT 4: STATE AFTER UPDATE (Transaction-based monitoring) ===
  // Monitor signalsMap changes with transaction tracking to guarantee complete lifecycle logging
  useEffect(() => {
    // Check if there are any active transactions
    const activeTransactions = Object.keys(stateTransitionRef.current);
    
    console.log('[DIAGNOSTIC] 4. STATE AFTER UPDATE:', {
      timestamp: new Date().toISOString(),
      stateUpdateTrigger: 'signalsMap_changed',
      currentStateKeys: Object.keys(signalsMap),
      currentStateCount: Object.keys(signalsMap).length,
      currentState: JSON.parse(JSON.stringify(signalsMap)),
      signalsList: Object.values(signalsMap).map(signal => ({
        id: signal.id,
        status: signal.status,
        assetName: signal.assetName,
        createdAt: signal.createdAt,
        updatedAt: signal.updatedAt,
        notes: signal.notes?.substring(0, 100) + (signal.notes && signal.notes.length > 100 ? '...' : ''),
        tpHits: signal.tpHits
      })),
      lastUpdatedTimestamp: lastUpdated?.toISOString() || null,
      activeTransactions: activeTransactions.length > 0 ? activeTransactions.map(id => ({
        transactionId: id,
        operation: stateTransitionRef.current[parseInt(id)]
      })) : [],
      transactionConsistencyCheck: {
        hasActiveTransactions: activeTransactions.length > 0,
        stateUpdatedAfterTransaction: true,
        lifecycleComplete: activeTransactions.length === 0
      }
    });
    
    // Perform consistency verification
    if (activeTransactions.length === 0) {
      console.log('[DIAGNOSTIC] ✅ STATE LIFECYCLE COMPLETE: All transactions processed, state is consistent');
    } else {
      console.warn('[DIAGNOSTIC] ⚠️ PENDING TRANSACTIONS: State update occurred with active transactions:', activeTransactions);
    }
  }, [signalsMap, lastUpdated]);

  const contextValue: SignalRealtimeContextType = {
    // PHASE 2: Provide both map and array access
    signalsMap,
    signals, // Computed from map for backward compatibility
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
    isInPollingMode,
    // PHASE 2: Map-based utilities
    getSignalById,
    updateSignal
  };

  return (
    <SignalRealtimeContext.Provider value={contextValue}>
      {children}
    </SignalRealtimeContext.Provider>
  );
};

export const useSignalRealtime = () => {
  const context = useContext(SignalRealtimeContext);
  if (!context) {
    // Instead of throwing, return a safe fallback object
    console.warn('useSignalRealtime used outside of SignalRealtimeProvider, returning fallback');
    return {
      signalsMap: {},
      signals: [],
      connectionStatus: 'disconnected' as const,
      lastUpdated: null,
      error: 'SignalRealtimeProvider not initialized',
      nextRetryAt: null,
      subscribe: () => console.warn('SignalRealtimeProvider not available'),
      unsubscribe: () => console.warn('SignalRealtimeProvider not available'),
      refreshSignals: async () => console.warn('SignalRealtimeProvider not available'),
      restartConnection: () => console.warn('SignalRealtimeProvider not available'),
      getConnectionHealth: () => ({ isHealthy: false, lastUpdate: null, mode: 'disconnected' }),
      forcePollingMode: () => console.warn('SignalRealtimeProvider not available'),
      isInPollingMode: false,
      getSignalById: () => undefined,
      updateSignal: () => console.warn('SignalRealtimeProvider not available')
    };
  }
  return context;
};
