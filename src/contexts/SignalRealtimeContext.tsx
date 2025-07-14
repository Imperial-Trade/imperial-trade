import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TradeAlertWithProfile } from '@/api/services/TradingApiService';
import { RealtimeChannel } from '@supabase/supabase-js';

interface SignalRealtimeContextType {
  signals: TradeAlertWithProfile[];
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastUpdated: Date | null;
  error: string | null;
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
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Helper function to check if user is educator or admin
  const isEducatorOrAdmin = (profile: any) => {
    if (!profile) return false;
    
    const role = profile.role?.toLowerCase();
    const userType = profile.user_type?.toLowerCase();
    const accessLevel = profile.access_level?.toLowerCase();
    
    return (
      role === 'admin' ||
      role === 'educator' ||
      userType === 'admin' ||
      userType === 'educator' ||
      accessLevel === 'admin' ||
      accessLevel === 'moderator'
    );
  };

  const refreshSignals = useCallback(async () => {
    try {
      console.log('SignalRealtimeContext - Refreshing signals...');
      
      // Fetch alerts and profiles separately for better performance
      const { data: alertsData, error: alertsError } = await supabase
        .from('trade_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (alertsError) {
        console.error('SignalRealtimeContext - Error fetching alerts:', alertsError);
        throw alertsError;
      }

      console.log('SignalRealtimeContext - Raw alerts data:', alertsData?.length || 0);

      if (!alertsData) {
        console.log('SignalRealtimeContext - No alerts data, setting empty array');
        setSignals([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(alertsData.map(alert => alert.user_id))];

      // Fetch profiles with role information
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      // Create profile map
      const profilesMap = new Map();
      if (profilesData) {
        profilesData.forEach(profile => {
          profilesMap.set(profile.id, profile);
        });
      }

      // Map alerts with profiles and filter for educators/admins only
      const alertsWithProfiles: TradeAlertWithProfile[] = alertsData
        .map(alert => {
          const profile = profilesMap.get(alert.user_id);
          const mappedAlert = {
            id: alert.id,
            assetName: alert.asset_name,
            finnhubSymbol: alert.finnhub_symbol,
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
            } : undefined
          };
          
          console.log('SignalRealtimeContext - Mapped alert:', {
            id: alert.id,
            asset: alert.asset_name,
            creator: profile ? {
              id: profile.id,
              role: profile.role,
              user_type: profile.user_type,
              access_level: profile.access_level,
              display_name: profile.display_name
            } : 'No profile',
            isEducatorOrAdmin: isEducatorOrAdmin(mappedAlert.creator)
          });
          
          return mappedAlert;
        })
        .filter(alert => isEducatorOrAdmin(alert.creator)); // Only show educator/admin signals

      console.log('SignalRealtimeContext - Final signals after filtering:', alertsWithProfiles.length);
      console.log('SignalRealtimeContext - All signals with educator status:', alertsWithProfiles.map(a => ({
        id: a.id,
        asset: a.assetName,
        creator: a.creator?.display_name,
        role: a.creator?.role,
        userType: a.creator?.user_type,
        accessLevel: a.creator?.access_level
      })));

      setSignals(alertsWithProfiles);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Failed to refresh signals:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh signals');
    }
  }, []);

  const handleRealtimeUpdate = useCallback(async (payload: any) => {
    console.log('Signal realtime update:', payload);
    
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      if (eventType === 'INSERT' && newRecord) {
        // Get profile for the new signal
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', newRecord.user_id)
          .single();

        // Only process if user is educator or admin
        if (!isEducatorOrAdmin(profile)) {
          return;
        }

        const newSignal: TradeAlertWithProfile = {
          id: newRecord.id,
          assetName: newRecord.asset_name,
          finnhubSymbol: newRecord.finnhub_symbol,
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
            avatar_url: profile.avatar_url
          } : undefined
        };

        setSignals(prev => [newSignal, ...prev]);
        
        // Dispatch custom event for notifications
        window.dispatchEvent(new CustomEvent('signal-posted'));
      } 
      else if (eventType === 'UPDATE' && newRecord) {
        // Check if the updated signal should remain visible (still from educator/admin)
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', newRecord.user_id)
          .single();

        if (isEducatorOrAdmin(profile)) {
          setSignals(prev => prev.map(signal => 
            signal.id === newRecord.id ? {
              ...signal,
              status: newRecord.status,
              tpHits: newRecord.tp_hits || [],
              closeReason: newRecord.close_reason,
              updatedAt: newRecord.updated_at
            } : signal
          ));
        } else {
          // Remove signal if user is no longer educator/admin
          setSignals(prev => prev.filter(signal => signal.id !== newRecord.id));
        }
      }
      else if (eventType === 'DELETE' && oldRecord) {
        setSignals(prev => prev.filter(signal => signal.id !== oldRecord.id));
      }

      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Failed to handle realtime update:', err);
    }
  }, []);

  const subscribe = useCallback(() => {
    if (channelRef.current) {
      console.log('Signal realtime already subscribed');
      return;
    }

    console.log('Subscribing to signal realtime updates');
    setConnectionStatus('connecting');

    channelRef.current = supabase
      .channel('signal-realtime')
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
        console.log('Signal realtime subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          setError(null);
          reconnectAttempts.current = 0;
          // Initial data load
          refreshSignals();
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('error');
          setError('Failed to connect to real-time updates');
          attemptReconnect();
        } else if (status === 'TIMED_OUT') {
          setConnectionStatus('error');
          setError('Connection timed out');
          attemptReconnect();
        }
      });
  }, [handleRealtimeUpdate, refreshSignals]);

  const attemptReconnect = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      setConnectionStatus('error');
      setError('Max reconnection attempts reached. Please refresh the page.');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttempts.current++;
      unsubscribe();
      subscribe();
    }, delay);
  }, []);

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
    
    setConnectionStatus('disconnected');
  }, []);

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
    throw new Error('useSignalRealtime must be used within a SignalRealtimeProvider');
  }
  return context;
};
