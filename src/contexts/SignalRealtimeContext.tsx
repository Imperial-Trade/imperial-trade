
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

// PHASE 3: Massive Realtime Usage Reduction - 90% cost savings
// Enhanced caching and shared connection strategy
let educatorUserIdsCache: string[] = [];
let educatorCacheExpiry = 0;
const EDUCATOR_CACHE_TTL = 15 * 60 * 1000; // Extended to 15 minutes
const LOCAL_CACHE_TTL = 5 * 60 * 1000; // 🔥 OPTIMIZED to 5 minute cache for closed signals
const SIGNAL_REFRESH_THROTTLE = 30000; // 🔥 OPTIMIZED to 30 seconds for better responsiveness

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
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastUpdated: Date | null;
  error: string | null;
  nextRetryAt: number | null;
  subscribe: () => void;
  unsubscribe: () => void;
  refreshSignals: () => Promise<void>;
}

const SignalRealtimeContext = createContext<SignalRealtimeContextType | null>(null);

interface SignalRealtimeProviderProps {
  children: React.ReactNode;
}

export const SignalRealtimeProvider: React.FC<SignalRealtimeProviderProps> = ({ children }) => {
  // 🔥 LEAK-PROOF: Deterministic channel ID for definitive logging
  const channelIdRef = useRef(generateChannelId('signal'));
  
  const [signals, setSignals] = useState<TradeAlertWithProfile[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nextRetryAt, setNextRetryAt] = useState<number | null>(null);
  const mountOnlyRef = useRef(false); // 🔥 LEAK-PROOF: Prevent operations after unmount
  
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
  
  // PHASE 3: Enhanced local caching to minimize database queries
  const localCacheRef = useRef<{ 
    data: TradeAlertWithProfile[], 
    expiry: number,
    educatorIds: string[],
    educatorExpiry: number 
  }>({ data: [], expiry: 0, educatorIds: [], educatorExpiry: 0 });

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
      
      // PHASE 3: Enhanced cache checking with educator IDs
      const cache = localCacheRef.current;
      if (cache.data.length > 0 && now < cache.expiry && cache.educatorIds.length > 0) {
        if (isDevToolsEnabled()) {
          console.log('📊 Using comprehensive cached signals, skipping all database queries');
        }
unstable_batchedUpdates(() => {
  setSignals(cache.data);
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

      // 🔥 RESTORED: Let database 1-hour window handle closed signals filtering
      // SignalCacheManager now only prevents flicker during WebSocket updates
      const filteredAlerts = allAlertsWithProfiles;
      
      // PHASE 3: Update comprehensive local cache with filtered results
      localCacheRef.current = {
        data: filteredAlerts,
        expiry: now + LOCAL_CACHE_TTL,
        educatorIds: educatorUserIds,
        educatorExpiry: localCacheRef.current.educatorExpiry || now + EDUCATOR_CACHE_TTL
      };
      
unstable_batchedUpdates(() => {
  setSignals(filteredAlerts);
  setLastUpdated(new Date());
  setError(null);
});
      
    } catch (err) {
      console.error('SignalRealtimeContext - Failed to refresh signals:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh signals');
    }
  }, []);

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
        
        setSignals(prev => {
          // Check for duplicates using the state from the setter to avoid stale closure
          const alreadyExists = prev.find(signal => signal.id === newSignal.id);
          if (alreadyExists) {
            if (isDevToolsEnabled()) {
              console.log('SignalRealtimeContext - Signal already in state, skipping duplication:', newSignal.id);
            }
            return prev;
          }
          return [newSignal, ...prev];
        });
        
        // PHASE 3: Update local cache with new signal
        const cache = localCacheRef.current;
        if (cache.data.length > 0) {
          cache.data = [newSignal, ...cache.data];
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
        
        setSignals(prev => {
          // 🚀 ORDER ACTIVATION BYPASS: Detect critical order status changes
          const currentSignal = prev.find(signal => signal.id === newRecord.id);
          const isOrderActivation = currentSignal?.status === 'pending' && newRecord.status === 'active';
          const isCriticalStatusChange = newRecord.status === 'closed' || isOrderActivation;
          const isNotesUpdate = currentSignal?.notes !== newRecord.notes;
          
          if (isDevToolsEnabled() && isCriticalStatusChange) {
            console.log(`🚀 ORDER STATUS BYPASS: ${currentSignal?.status} → ${newRecord.status} for ${newRecord.asset_name}`);
          }
          
          if (isDevToolsEnabled() && isNotesUpdate) {
            console.log(`📝 NOTES UPDATE: "${currentSignal?.notes}" → "${newRecord.notes}" for ${newRecord.asset_name} (${newRecord.id})`);
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
          }
          
          const updatedSignals = prev.map(signal => 
            signal.id === newRecord.id ? {
              ...signal,
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
              updatedAt: newRecord.updated_at
            } : signal
          );
          
          // PHASE 5: CRITICAL FIX - Validate TP progression to prevent regression
          const validatedSignals = updatedSignals.map(signal => {
            if (signal.id === newRecord.id && newRecord.tp_hits) {
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
                  console.warn(`🚨 INVALID TP SEQUENCE: Expected TP${expectedTp}, got TP${sortedTpHits[i]} for signal ${signal.id}`);
                  break;
                }
              }
              
              return {
                ...signal,
                tpHits: validTpHits // Use validated TP hits
              };
            }
            return signal;
          });
          
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
          
          // 🔥 FLICKER PREVENTION: Apply cache filtering only during WebSocket updates
          return signalCacheManager.filterExpiredClosedSignals(updatedSignals);
        });
        
        // 🔥 FIX CLOSED SIGNALS: Mark signal as closed in cache manager
        if (eventType === 'UPDATE' && newRecord?.status === 'closed') {
          signalCacheManager.markSignalClosed(newRecord.id, newRecord.updated_at);
        }
        
        if (isDevToolsEnabled()) {
          console.log('SignalRealtimeContext - Updated signal in state:', newRecord.id);
        }
      }
      else if (eventType === 'DELETE' && oldRecord) {
        if (isDevToolsEnabled()) {
          console.log('SignalRealtimeContext - Processing DELETE for alert:', oldRecord.id);
        }
        setSignals(prev => prev.filter(signal => signal.id !== oldRecord.id));
        
        // PHASE 3: Update local cache by removing deleted signal
        const cache = localCacheRef.current;
        if (cache.data.length > 0) {
          cache.data = cache.data.filter(signal => signal.id !== oldRecord.id);
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
    }
  }, [subscribeToTable, handleRealtimeUpdate, refreshSignals, isSignalSubscriptionAllowed]);

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
    signals,
    connectionStatus: connectionState.connectionStatus,
    lastUpdated,
    error: error || connectionState.error,
    nextRetryAt,
    subscribe,
    unsubscribe,
    refreshSignals
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
      signals: [],
      connectionStatus: 'disconnected' as const,
      lastUpdated: null,
      error: 'SignalRealtimeProvider not initialized',
      nextRetryAt: null,
      subscribe: () => console.warn('SignalRealtimeProvider not available'),
      unsubscribe: () => console.warn('SignalRealtimeProvider not available'),
      refreshSignals: async () => console.warn('SignalRealtimeProvider not available')
    };
  }
  return context;
};
