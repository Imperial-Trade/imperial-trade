
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TradeAlertWithProfile } from '@/types/trading';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useInstantAlerts } from '@/hooks/useInstantAlerts';

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

  // Initialize instant alerts for zero-delay notifications
  useInstantAlerts();

  const refreshSignals = useCallback(async () => {
    try {
      console.log('SignalRealtimeContext - Starting signal refresh with new RLS policies...');
      
      // Fetch ALL alerts - RLS policies will handle filtering to only show educator/admin alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('trade_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (alertsError) {
        console.error('SignalRealtimeContext - Error fetching alerts:', alertsError);
        throw alertsError;
      }

      console.log('SignalRealtimeContext - Fetched alerts (filtered by RLS):', alertsData?.length || 0);

      if (!alertsData || alertsData.length === 0) {
        console.log('SignalRealtimeContext - No alerts found, setting empty array');
        setSignals([]);
        return;
      }

      // Get ALL unique user IDs from alerts
      const userIds = [...new Set(alertsData.map(alert => alert.user_id))];
      console.log('SignalRealtimeContext - Unique user IDs from alerts:', userIds);

      // Fetch ALL profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError) {
        console.error('SignalRealtimeContext - Error fetching profiles:', profilesError);
      }

      console.log('SignalRealtimeContext - Fetched profiles:', profilesData?.length || 0);
      
      // Create profile map for quick lookup
      const profilesMap = new Map();
      if (profilesData) {
        profilesData.forEach(profile => {
          profilesMap.set(profile.id, profile);
          console.log('SignalRealtimeContext - Profile in map:', {
            id: profile.id,
            displayName: profile.display_name,
            role: profile.role,
            userType: profile.user_type,
            accessLevel: profile.access_level
          });
        });
      }

      // Map ALL alerts with their profiles - RLS already filtered to educator/admin signals
      const allAlertsWithProfiles: TradeAlertWithProfile[] = alertsData.map(alert => {
        const profile = profilesMap.get(alert.user_id);
        
        const mappedAlert = {
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
        
        return mappedAlert;
      });

      console.log('SignalRealtimeContext - Final signals from RLS-filtered data:', allAlertsWithProfiles.length);
      console.log('SignalRealtimeContext - Signal details:', allAlertsWithProfiles.map(s => ({
        id: s.id,
        asset: s.assetName,
        creator: s.creator?.display_name,
        role: s.creator?.role,
        userType: s.creator?.user_type,
        accessLevel: s.creator?.access_level
      })));

      setSignals(allAlertsWithProfiles);
      setLastUpdated(new Date());
      setError(null);
      
      console.log('SignalRealtimeContext - Successfully set signals:', allAlertsWithProfiles.length);
      
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

  const subscribe = useCallback(() => {
    if (channelRef.current) {
      console.log('SignalRealtimeContext - Already subscribed to real-time');
      return;
    }

    console.log('SignalRealtimeContext - Subscribing to global signal real-time updates');
    setConnectionStatus('connecting');

    // Subscribe to ALL trade_alerts changes globally - RLS will filter appropriately
    channelRef.current = supabase
      .channel('global-signals-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trade_alerts'
        },
        handleRealtimeUpdate
      )
      .subscribe((status) => {
        console.log('SignalRealtimeContext - Real-time subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          setError(null);
          setNextRetryAt(null);
          reconnectAttempts.current = 0;
          // Initial data load after successful connection
          refreshSignals();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('connecting');
          setError(null);
          attemptReconnect();
        }
      });
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
    // Always keep trying with exponential backoff + jitter
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setConnectionStatus('connecting');
    setError(null);

    const baseDelay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
    const jitter = Math.random() * 500; // add small jitter to avoid thundering herd
    const delay = Math.max(500, baseDelay + jitter);
    const target = Date.now() + delay;
    setNextRetryAt(target);

    console.log(`Attempting to reconnect in ${Math.round(delay)}ms (attempt ${reconnectAttempts.current + 1})`);
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
