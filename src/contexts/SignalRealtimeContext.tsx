import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TradeAlertWithProfile } from '@/api/services/TradingApiService';
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
      console.log('SignalRealtimeContext - Starting Xeon Stream signal refresh...');
      
      // First, let's update existing educator/admin signals to be Xeon Stream signals
      const { error: updateError } = await supabase
        .from('trade_alerts')
        .update({ is_xeon_stream: true })
        .in('user_id', 
          supabase
            .from('profiles')
            .select('id')
            .or('access_level.eq.admin,access_level.eq.moderator,user_type.eq.educator')
        );

      if (updateError) {
        console.warn('SignalRealtimeContext - Could not update existing signals:', updateError);
      } else {
        console.log('SignalRealtimeContext - Updated existing educator/admin signals to Xeon Stream');
      }

      // Fetch Xeon Stream alerts only - RLS policies will handle educator/admin filtering
      const { data: alertsData, error: alertsError } = await supabase
        .from('trade_alerts')
        .select('*')
        .eq('is_xeon_stream', true)
        .order('created_at', { ascending: false });

      if (alertsError) {
        console.error('SignalRealtimeContext - Error fetching Xeon Stream alerts:', alertsError);
        throw alertsError;
      }

      console.log('SignalRealtimeContext - Fetched Xeon Stream alerts:', alertsData?.length || 0);

      if (!alertsData || alertsData.length === 0) {
        console.log('SignalRealtimeContext - No Xeon Stream alerts found, setting empty array');
        setSignals([]);
        return;
      }

      // Get unique user IDs from alerts
      const userIds = [...new Set(alertsData.map(alert => alert.user_id))];
      console.log('SignalRealtimeContext - Unique user IDs from Xeon Stream alerts:', userIds);

      // Fetch profiles for these users
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

      // Map Xeon Stream alerts with their profiles
      const xeonStreamAlertsWithProfiles: TradeAlertWithProfile[] = alertsData.map(alert => {
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

      console.log('SignalRealtimeContext - Final Xeon Stream signals:', xeonStreamAlertsWithProfiles.length);
      console.log('SignalRealtimeContext - Signal details:', xeonStreamAlertsWithProfiles.map(s => ({
        id: s.id,
        asset: s.assetName,
        creator: s.creator?.display_name,
        role: s.creator?.role,
        userType: s.creator?.user_type,
        accessLevel: s.creator?.access_level
      })));

      setSignals(xeonStreamAlertsWithProfiles);
      setLastUpdated(new Date());
      setError(null);
      
      console.log('SignalRealtimeContext - Successfully set Xeon Stream signals:', xeonStreamAlertsWithProfiles.length);
      
    } catch (err) {
      console.error('SignalRealtimeContext - Failed to refresh Xeon Stream signals:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh Xeon Stream signals');
    }
  }, []);

  const handleRealtimeUpdate = useCallback(async (payload: any) => {
    console.log('SignalRealtimeContext - Real-time update received:', payload);
    
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      // Only process records that are Xeon Stream or could become Xeon Stream
      if (eventType === 'INSERT' && newRecord) {
        console.log('SignalRealtimeContext - Processing INSERT for alert:', newRecord.id);
        
        // Check if this is a Xeon Stream signal
        if (!newRecord.is_xeon_stream) {
          console.log('SignalRealtimeContext - Not a Xeon Stream signal, ignoring INSERT');
          return;
        }
        
        // Get profile for the new signal
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', newRecord.user_id)
          .single();

        if (profileError) {
          console.error('SignalRealtimeContext - Error fetching profile for new signal:', profileError);
        }

        console.log('SignalRealtimeContext - Profile for new Xeon Stream signal:', profile);

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

        console.log('SignalRealtimeContext - Adding new Xeon Stream signal to state:', newSignal);
        setSignals(prev => {
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
        
        // Handle case where signal becomes Xeon Stream or stops being Xeon Stream
        if (newRecord.is_xeon_stream && !oldRecord?.is_xeon_stream) {
          // Signal became Xeon Stream - add it
          console.log('SignalRealtimeContext - Signal became Xeon Stream, adding to state');
          await refreshSignals(); // Refresh to get the new signal with profile
          return;
        } else if (!newRecord.is_xeon_stream && oldRecord?.is_xeon_stream) {
          // Signal is no longer Xeon Stream - remove it
          console.log('SignalRealtimeContext - Signal no longer Xeon Stream, removing from state');
          setSignals(prev => prev.filter(signal => signal.id !== newRecord.id));
          return;
        } else if (!newRecord.is_xeon_stream) {
          // Not a Xeon Stream signal, ignore
          console.log('SignalRealtimeContext - Not a Xeon Stream signal, ignoring UPDATE');
          return;
        }
        
        // Update existing Xeon Stream signal
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
        console.log('SignalRealtimeContext - Updated Xeon Stream signal in state:', newRecord.id);
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
  }, [refreshSignals]);

  const subscribe = useCallback(() => {
    if (channelRef.current) {
      console.log('SignalRealtimeContext - Already subscribed to real-time');
      return;
    }

    console.log('SignalRealtimeContext - Subscribing to Xeon Stream signal real-time updates');
    setConnectionStatus('connecting');

    // Subscribe to ALL trade_alerts changes globally - we'll filter in the handler
    channelRef.current = supabase
      .channel('xeon-stream-signals-realtime')
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
      console.log('Unsubscribing from Xeon Stream signal realtime');
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
