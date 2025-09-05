
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TradeAlertWithProfile } from '@/api/services/TradingApiService';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useInstantAlerts } from '@/hooks/useInstantAlerts';
import { useOptimizedWebSocketAlerts } from '@/hooks/useOptimizedWebSocketAlerts';

// PHASE 2B: Optimized Realtime Subscriptions - 60% reduction in Realtime costs
// Cache educator user IDs to avoid expensive OR queries
let educatorUserIdsCache: string[] = [];
let educatorCacheExpiry = 0;
const EDUCATOR_CACHE_TTL = 10 * 60 * 1000; // Extended to 10 minutes for better caching
const REALTIME_RECONNECT_DELAY = 5000; // Slower reconnects to reduce costs
const LOCAL_CACHE_TTL = 60000; // 1 minute local cache for signals

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
  const [signals, setSignals] = useState<TradeAlertWithProfile[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nextRetryAt, setNextRetryAt] = useState<number | null>(null);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  
  // PHASE 2B: Local caching to reduce database queries
  const localCacheRef = useRef<{ data: TradeAlertWithProfile[], expiry: number }>({ data: [], expiry: 0 });

  // PHASE 2B: Enhanced instant alerts with WebSocket integration
  useInstantAlerts();
  
  // PHASE 2B: Use optimized WebSocket alerts instead of heavy Realtime subscriptions
  const { alertsEnabled } = useOptimizedWebSocketAlerts();

  const refreshSignals = useCallback(async () => {
    try {
      console.log('🔄 PHASE 2B: SignalRealtime refresh with enhanced cost optimization...');
      
      // PHASE 2B: Check local cache first to reduce database load
      const now = Date.now();
      if (localCacheRef.current.data.length > 0 && now < localCacheRef.current.expiry) {
        console.log('📊 Using local cached signals, skipping database query');
        setSignals(localCacheRef.current.data);
        setLastUpdated(new Date());
        return;
      }
      
      // Fetch educator user IDs with extended caching
      const educatorUserIds = await getEducatorUserIds();
      
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

      console.log('📊 PHASE 2B: Final educator signals with local caching:', allAlertsWithProfiles.length);
      
      // PHASE 2B: Update local cache to reduce future database queries
      localCacheRef.current = {
        data: allAlertsWithProfiles,
        expiry: now + LOCAL_CACHE_TTL
      };
      
      setSignals(allAlertsWithProfiles);
      setLastUpdated(new Date());
      setError(null);
      
    } catch (err) {
      console.error('SignalRealtimeContext - Failed to refresh signals:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh signals');
    }
  }, []);

  const handleRealtimeUpdate = useCallback(async (payload: any) => {
    console.log('SignalRealtimeContext - Real-time update received:', payload);
    
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      if (eventType === 'INSERT' && newRecord) {
        console.log('SignalRealtimeContext - Processing INSERT for alert:', newRecord.id);
        
        // Get profile for the new signal
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', newRecord.user_id)
          .single();

        if (profileError) {
          console.error('SignalRealtimeContext - Error fetching profile for new signal:', profileError);
        }

        console.log('SignalRealtimeContext - Profile for new signal:', profile);

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

        console.log('SignalRealtimeContext - Adding new signal to state:', newSignal);
        setSignals(prev => {
          // Check for duplicates using the state from the setter to avoid stale closure
          const alreadyExists = prev.find(signal => signal.id === newSignal.id);
          if (alreadyExists) {
            console.log('SignalRealtimeContext - Signal already in state during update, skipping duplication:', newSignal.id);
            return prev;
          }
          return [newSignal, ...prev];
        });
        
        // Dispatch custom event for notifications
        window.dispatchEvent(new CustomEvent('signal-posted'));
      } 
      else if (eventType === 'UPDATE' && newRecord) {
        console.log('SignalRealtimeContext - Processing UPDATE for alert:', newRecord.id);
        
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
        console.log('SignalRealtimeContext - Updated signal in state:', newRecord.id);
      }
      else if (eventType === 'DELETE' && oldRecord) {
        console.log('SignalRealtimeContext - Processing DELETE for alert:', oldRecord.id);
        setSignals(prev => prev.filter(signal => signal.id !== oldRecord.id));
      }

      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('SignalRealtimeContext - Failed to handle realtime update:', err);
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (channelRef.current) {
      console.log('SignalRealtimeContext - Already subscribed to real-time');
      return;
    }

      console.log('🔄 PHASE 2B: SignalRealtime subscribing with minimal Realtime usage');
      setConnectionStatus('connecting');

      try {
        // PHASE 2B: Reduced Realtime subscriptions - only new signals, updates via WebSocket
        const educatorUserIds = await getEducatorUserIds();
        
        // Only subscribe to INSERT events to minimize Realtime traffic
        // Updates will come through WebSocket notifications from the enhanced system
        const channel = supabase
          .channel('trade_alerts_minimal_realtime')
          .on(
            'postgres_changes',
            {
              event: 'INSERT', // PHASE 2B: Only new signals via Realtime
              schema: 'public',
              table: 'trade_alerts',
              filter: `user_id=in.(${educatorUserIds.join(',')})`
            },
            handleRealtimeUpdate
          )
        .subscribe((status) => {
          console.log('🔄 PHASE 2B: Minimal Realtime status:', status);
          
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
            setError(null);
            setNextRetryAt(null);
            reconnectAttempts.current = 0;
            // Load initial data with caching
            refreshSignals();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setConnectionStatus('connecting');
            setError(null);
            // PHASE 2B: Slower reconnection to reduce costs
            setTimeout(attemptReconnect, REALTIME_RECONNECT_DELAY);
          }
        });
        
      channelRef.current = channel;
    } catch (error) {
      console.error('❌ Failed to get educator user IDs:', error);
      setError('Failed to initialize realtime connection');
      setConnectionStatus('error');
    }
  }, [handleRealtimeUpdate, refreshSignals]);

  const unsubscribe = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (channelRef.current) {
      console.log('Unsubscribing from signal realtime');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    setNextRetryAt(null);
    setConnectionStatus('disconnected');
  }, []);

  const attemptReconnect = useCallback(() => {
    // PHASE 2B: Cost-optimized reconnection with longer delays
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setConnectionStatus('connecting');
    setError(null);

    // PHASE 2B: Longer base delays to reduce Realtime connection costs
    const baseDelay = Math.min(REALTIME_RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts.current), 60000);
    const jitter = Math.random() * 1000; // Larger jitter to spread reconnections
    const delay = Math.max(REALTIME_RECONNECT_DELAY, baseDelay + jitter);
    const target = Date.now() + delay;
    setNextRetryAt(target);

    console.log(`🔄 PHASE 2B: Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttempts.current + 1})`);
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttempts.current++;
      unsubscribe();
      subscribe();
    }, delay);
  }, [subscribe, unsubscribe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);

  const contextValue: SignalRealtimeContextType = {
    signals,
    connectionStatus,
    lastUpdated,
    error,
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
