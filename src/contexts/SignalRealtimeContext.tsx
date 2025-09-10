
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TradeAlertWithProfile } from '@/api/services/TradingApiService';
import { useSharedRealtime } from './SharedRealtimeContext';
import { useRealtimeHealth } from './RealtimeHealthMonitor';
import { useRealtimeGate } from '@/hooks/useRouteGatedSubscriptions';
import { useTelemetry } from '@/contexts/TelemetryContext';
import { isDevToolsEnabled } from '@/utils/featureFlags';
import { useRealtimeTelemetry } from '@/hooks/useRealtimeTelemetry';

// PHASE 3: Massive Realtime Usage Reduction - 90% cost savings
// Enhanced caching and shared connection strategy
let educatorUserIdsCache: string[] = [];
let educatorCacheExpiry = 0;
const EDUCATOR_CACHE_TTL = 15 * 60 * 1000; // Extended to 15 minutes
const LOCAL_CACHE_TTL = 10 * 60 * 1000; // 🔥 DOUBLED to 10 minute cache
const SIGNAL_REFRESH_THROTTLE = 120000; // 🔥 INCREASED to 2 minutes between refreshes

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
  // Deterministic channel ID for logging
  const channelIdRef = useRef(`signal-${Date.now()}-${Math.random().toString(36).slice(-4)}`);
  
  const [signals, setSignals] = useState<TradeAlertWithProfile[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nextRetryAt, setNextRetryAt] = useState<number | null>(null);
  
  // PHASE 3: Use shared Realtime connection to eliminate duplicate channels + HEALTH MONITORING
  const { connectionState, subscribeToTable } = useSharedRealtime();
  const healthMonitor = useRealtimeHealth();
  const { recordMessage, recordConnection } = useRealtimeTelemetry();
  
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
        setSignals(cache.data);
        setLastUpdated(new Date());
        return;
      }
      
      // PHASE 3: Use cached educator IDs or fetch fresh ones
      let educatorUserIds = cache.educatorIds;
      if (educatorUserIds.length === 0 || now >= cache.educatorExpiry) {
        educatorUserIds = await getEducatorUserIds();
        localCacheRef.current.educatorIds = educatorUserIds;
        localCacheRef.current.educatorExpiry = now + EDUCATOR_CACHE_TTL;
      }
      
      // First get alerts from educator users
      const { data: alertsData, error: alertsError } = await supabase
        .from('trade_alerts')
        .select('*')
        .in('user_id', educatorUserIds)
        .order('created_at', { ascending: false })
        .limit(50);

      if (alertsError) {
        console.error('SignalRealtimeContext - Error fetching alerts:', alertsError);
        throw alertsError;
      }

      console.log('SignalRealtimeContext - Fetched educator alerts:', alertsData?.length || 0);

      if (!alertsData || alertsData.length === 0) {
        console.log('SignalRealtimeContext - No educator alerts found');
        setSignals([]);
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

      if (isDevToolsEnabled()) {
        console.log('📊 PHASE 3: Final educator signals with enhanced caching:', allAlertsWithProfiles.length);
      }
      
      // PHASE 3: Update comprehensive local cache
      localCacheRef.current = {
        data: allAlertsWithProfiles,
        expiry: now + LOCAL_CACHE_TTL,
        educatorIds: educatorUserIds,
        educatorExpiry: localCacheRef.current.educatorExpiry || now + EDUCATOR_CACHE_TTL
      };
      
      setSignals(allAlertsWithProfiles);
      setLastUpdated(new Date());
      setError(null);
      
    } catch (err) {
      console.error('SignalRealtimeContext - Failed to refresh signals:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh signals');
    }
  }, []);

  // 🔥 ADD THROTTLING: Track last update time per signal to prevent spam
  const lastUpdateRef = useRef<Map<string, number>>(new Map());
  
  const handleRealtimeUpdate = useCallback(async (payload: any) => {
    const now = Date.now();
    const signalId = payload?.new?.id || payload?.old?.id;
    
    // 🔥 THROTTLE UPDATES: Max 1 update per signal per 5 seconds
    if (signalId) {
      const lastUpdate = lastUpdateRef.current.get(signalId) || 0;
      if (now - lastUpdate < 5000) {
        if (isDevToolsEnabled()) {
          console.log('🛑 Update throttled for signal:', signalId);
        }
        return;
      }
      lastUpdateRef.current.set(signalId, now);
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
        
        // Dispatch custom event for notifications
        window.dispatchEvent(new CustomEvent('signal-posted'));
      } 
      else if (eventType === 'UPDATE' && newRecord) {
        if (isDevToolsEnabled()) {
          console.log('SignalRealtimeContext - Processing UPDATE for alert:', newRecord.id);
        }
        
        setSignals(prev => prev.map(signal => 
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
        ));
        
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

      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('SignalRealtimeContext - Failed to handle realtime update:', err);
    }
  }, []);

  const subscribe = useCallback(async () => {
    // PHASE B: Route gating - only subscribe if current route allows signals
    if (!isSignalSubscriptionAllowed) {
      if (isDevToolsEnabled()) {
        console.log('🚦 Signal subscription blocked by route gating');
      }
      return;
    }

    if (unsubscribeRef.current) {
      if (isDevToolsEnabled()) {
        console.log('SignalRealtimeContext - Already subscribed via shared connection');
      }
      return;
    }

    if (isDevToolsEnabled()) {
      console.log(`🔄 PHASE 3: SignalRealtime [${channelIdRef.current}] subscribing via shared connection (massive savings)`);
    }

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
      
      // 🔥 CRITICAL: Subscribe to UPDATES as well but with reduced frequency
      const unsubscribe = subscribeToTable(
        {
          table: 'trade_alerts',
          event: '*', // All events but processed with heavy throttling
          filter: `user_id=in.(${educatorUserIds.join(',')})`
        },
        handleRealtimeUpdate
      );
      
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

  const unsubscribe = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (unsubscribeRef.current) {
      if (isDevToolsEnabled()) {
        console.log(`SignalRealtimeContext [${channelIdRef.current}] - Unsubscribing from shared signal realtime`);
      }
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    setNextRetryAt(null);
  }, []);

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

  // Mount-only health registration to prevent flapping
  useEffect(() => {
    if (isDevToolsEnabled()) {
      console.log(`📊 SignalRealtime: MOUNT [${channelIdRef.current}] registering with health monitor`);
    }
    healthMonitor.registerConnection('SignalRealtime');
    
    return () => {
      if (isDevToolsEnabled()) {
        console.log(`📊 SignalRealtime: UNMOUNT [${channelIdRef.current}] unregistering from health monitor`);
      }
      healthMonitor.unregisterConnection('SignalRealtime');
      unsubscribe();
    };
  }, []); // Empty dependencies to prevent re-registration flapping

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
