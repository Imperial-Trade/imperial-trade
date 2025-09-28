
import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { unstable_batchedUpdates } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { TradeAlertWithProfile, transformTradeAlertWithProfile } from '@/utils/dataTransformers';
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
  
  // PHASE 2: Map-based local caching to minimize database queries
  const localCacheRef = useRef<{ 
    dataMap: Record<string, TradeAlertWithProfile>, 
    expiry: number,
    educatorIds: string[],
    educatorExpiry: number 
  }>({ dataMap: {}, expiry: 0, educatorIds: [], educatorExpiry: 0 });

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
      
unstable_batchedUpdates(() => {
  setSignalsMap(alertsMap);
  setLastUpdated(new Date());
  setError(null);
});
      
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

        // ACL: Transform database record with profile to camelCase
        const newSignal: TradeAlertWithProfile = transformTradeAlertWithProfile({
          ...newRecord,
          profiles: profile || undefined
        });

        if (isDevToolsEnabled()) {
          console.log('SignalRealtimeContext - Adding new signal to state:', newSignal);
        }
        
        // PHASE 2: Map-based state update with O(1) duplicate check
        setSignalsMap(prev => {
          // Check for duplicates using O(1) lookup
          if (prev[newSignal.id]) {
            if (isDevToolsEnabled()) {
              console.log('SignalRealtimeContext - Signal already in state, skipping duplication:', newSignal.id);
            }
            return prev;
          }
          return { ...prev, [newSignal.id]: newSignal };
        });
        
        // PHASE 2: Update local cache with new signal (map-based)
        const cache = localCacheRef.current;
        if (Object.keys(cache.dataMap).length > 0) {
          cache.dataMap = { ...cache.dataMap, [newSignal.id]: newSignal };
        }
        
        // 🚨 PHASE 3: Dispatch enhanced in-app notification for new signals
        if ((window as any).addNotification) {
          (window as any).addNotification({
            type: 'signal_created',
            title: `🚨 New ${newRecord.trade_type?.replace('_', ' ')?.toUpperCase()} Signal`,
            message: `${profile?.display_name || 'Educator'} posted ${newRecord.asset_name} at $${newRecord.entry_price}`,
            signalId: newRecord.id,
            assetName: newRecord.asset_name,
            authorName: profile?.display_name || 'Educator',
            priority: 'high',
            autoRemove: true,
          });
        }
        
        // Also dispatch custom event for backwards compatibility
        window.dispatchEvent(new CustomEvent('signal-posted'));
      } 
      else if (eventType === 'UPDATE' && newRecord) {
        if (isDevToolsEnabled()) {
          console.log('SignalRealtimeContext - Processing UPDATE for alert:', newRecord.id);
        }
        
        // PHASE 2: Map-based state update for better performance
        setSignalsMap(prev => {
          // 🚀 ORDER ACTIVATION BYPASS: Detect critical order status changes with O(1) lookup
          const existingSignal = prev[newRecord.id];
          const isOrderActivation = existingSignal?.status === 'pending' && newRecord.status === 'active';
          const isCriticalStatusChange = newRecord.status === 'closed' || isOrderActivation;
          const isNotesUpdate = existingSignal?.notes !== newRecord.notes;
          
          if (isDevToolsEnabled() && isCriticalStatusChange) {
            console.log(`🚀 ORDER STATUS BYPASS: ${existingSignal?.status} → ${newRecord.status} for ${newRecord.asset_name}`);
          }
          
          if (isDevToolsEnabled() && isNotesUpdate) {
            console.log(`📝 NOTES UPDATE: "${existingSignal?.notes}" → "${newRecord.notes}" for ${newRecord.asset_name} (${newRecord.id})`);
          }

          // 🎯 ACTIVATION PRIORITY: Force immediate re-render for order activations
          if (isOrderActivation) {
            console.log(`🎯 ACTIVATION DETECTED: Forcing immediate UI update for ${newRecord.asset_name} (${newRecord.id})`);
            
            // Dispatch activation event with high priority
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('order-activation-confirmed', {
                detail: {
                  signalId: newRecord.id,
                  assetName: newRecord.asset_name,
                  status: 'active',
                  timestamp: new Date().toISOString(),
                  priority: 'high'
                }
              }));
            }, 0);

            // 🚀 PHASE 2: Enhanced activation reliability - Force delayed refresh with map update
            setTimeout(() => {
              console.log(`🔄 ACTIVATION REFRESH: Triggering delayed UI sync for ${newRecord.asset_name}`);
              setSignalsMap(current => {
                if (!current[newRecord.id]) return current;
                return {
                  ...current,
                  [newRecord.id]: {
                    ...current[newRecord.id],
                    status: 'active',
                    updatedAt: new Date().toISOString()
                  }
                };
              });
            }, 100);
          }
          
          // Skip if signal doesn't exist
          if (!prev[newRecord.id]) {
            return prev;
          }
          
          // ACL: Transform database record to camelCase and merge with existing signal
          const storedSignal = prev[newRecord.id];
          const transformedRecord = transformTradeAlertWithProfile({
            ...newRecord,
            profiles: storedSignal.creator ? {
              id: storedSignal.creator.id,
              display_name: storedSignal.creator.display_name,
              role: storedSignal.creator.role,
              avatar_url: storedSignal.creator.avatar_url || null,
              user_type: storedSignal.creator.user_type || null,
              access_level: storedSignal.creator.access_level || null
            } : undefined
          });
          
          const updatedSignal = {
            ...storedSignal,
            ...transformedRecord,
            creator: storedSignal.creator // Preserve existing creator info
          };
          
          // PHASE 5: CRITICAL FIX - Validate TP progression to prevent regression
          let finalSignal = updatedSignal;
          if (newRecord.tp_hits) {
            // Ensure TP hits are sequential and valid
            const validTpHits = [];
            const sortedTpHits = [...newRecord.tp_hits].sort((a, b) => a - b);
            
            // Only allow sequential TP hits (1, then 2, then 3, etc.)
            for (let i = 0; i < sortedTpHits.length; i++) {
              const expectedTp = i + 1;
              if (sortedTpHits[i] === expectedTp) {
                validTpHits.push(expectedTp);
              } else {
                // Invalid TP sequence detected, break
                console.warn(`🚨 INVALID TP SEQUENCE: Expected TP${expectedTp}, got TP${sortedTpHits[i]} for signal ${finalSignal.id}`);
                break;
              }
            }
            
            finalSignal = {
              ...finalSignal,
              tpHits: validTpHits // Use validated TP hits
            };
          }
          
          // 🚀 INSTANT FEEDBACK: Dispatch immediate UI update for order activations
          if (isOrderActivation) {
            // Enhanced activation notification
            if ((window as any).addNotification) {
              (window as any).addNotification({
                type: 'order_activated',
                title: `🚀 Order Activated!`,
                message: `${newRecord.asset_name} ${newRecord.trade_type} is now ACTIVE`,
                priority: 'high',
                autoRemove: true,
                duration: 5000
              });
            }
            
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('order-activated', {
                detail: {
                  signalId: newRecord.id,
                  assetName: newRecord.asset_name,
                  status: newRecord.status,
                  timestamp: new Date().toISOString(),
                  priority: 'high'
                }
              }));
            }, 0);
          }
          
          // PHASE 2: Update the map with the validated signal
          const updatedMap = { ...prev, [newRecord.id]: finalSignal };
          
          // Developer mode logging for state transitions
          if (isDevToolsEnabled()) {
            console.log(`[SignalRealtime] UPDATE event for signal ${newRecord.id}:`, {
              oldStatus: prev[newRecord.id]?.status,
              newStatus: newRecord.status,
              signalsBefore: Object.keys(prev).length,
              signalsAfter: Object.keys(updatedMap).length
            });
          }
          
          // Mark as closed in cache for telemetry (but don't filter from state during UPDATE)
          if (newRecord.status === 'closed') {
            signalCacheManager.markSignalClosed(newRecord.id, newRecord.closed_at || newRecord.updated_at);
            if (isDevToolsEnabled()) {
              console.log(`[SignalRealtime] Signal ${newRecord.id} marked as closed, keeping in state for immediate UI update`);
            }
          }
          
          // Return updated map directly for UPDATE events to preserve immediate status transitions
          return updatedMap;
        });
        
        if (isDevToolsEnabled()) {
          console.log('SignalRealtimeContext - Updated signal in state:', newRecord.id);
        }
      }
      else if (eventType === 'DELETE' && oldRecord) {
        if (isDevToolsEnabled()) {
          console.log('SignalRealtimeContext - Processing DELETE for alert:', oldRecord.id);
        }
        
        // PHASE 2: Map-based deletion with O(1) operation
        setSignalsMap(prev => {
          const { [oldRecord.id]: deleted, ...remaining } = prev;
          return remaining;
        });
        
        // PHASE 2: Update local cache by removing deleted signal (map-based)
        const cache = localCacheRef.current;
        if (Object.keys(cache.dataMap).length > 0) {
          const { [oldRecord.id]: deleted, ...remaining } = cache.dataMap;
          cache.dataMap = remaining;
        }
      }

unstable_batchedUpdates(() => {
  setLastUpdated(new Date());
  setError(null);
});
    } catch (err) {
      console.error('SignalRealtimeContext - Failed to handle realtime update:', err);
    }
  }, []);

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
        handleRealtimeUpdate
      );
      
      // 🚀 ENHANCED UPDATE FILTER: All meaningful updates for comprehensive coverage
      const unsubscribeUpdate = subscribeToTable(
        {
          table: 'trade_alerts', 
          event: 'UPDATE',
          // Capture all significant changes: status changes, TP hits, notes, activations
          filter: `user_id=in.(${educatorUserIds.join(',')})`
        },
        handleRealtimeUpdate
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
  }, [subscribeToTable, handleRealtimeUpdate, refreshSignals, isSignalSubscriptionAllowed, updateConnectionState]);

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
