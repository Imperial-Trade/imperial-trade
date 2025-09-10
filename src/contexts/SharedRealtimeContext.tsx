import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { isDevToolsEnabled } from '@/utils/featureFlags';
import { connectionStabilizer } from '@/utils/connectionStabilizer';
import { useRealtimeHealth } from './RealtimeHealthMonitor';

// Shared connection state to prevent multiple Realtime channels
interface SharedRealtimeState {
  isConnected: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  error: string | null;
  lastUpdated: Date | null;
  subscribers: Set<string>;
}

interface SharedRealtimeContextType {
  connectionState: SharedRealtimeState;
  subscribeToTable: (tableConfig: TableSubscriptionConfig, callback: RealtimeCallback) => () => void;
  getConnectionHealth: () => { isHealthy: boolean; connectionCount: number };
}

interface TableSubscriptionConfig {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  schema?: string;
}

type RealtimeCallback = (payload: any) => void;

const SharedRealtimeContext = createContext<SharedRealtimeContextType | null>(null);

export const useSharedRealtime = () => {
  const context = useContext(SharedRealtimeContext);
  if (!context) {
    throw new Error('useSharedRealtime must be used within SharedRealtimeProvider');
  }
  return context;
};

interface SharedRealtimeProviderProps {
  children: React.ReactNode;
}

export const SharedRealtimeProvider: React.FC<SharedRealtimeProviderProps> = ({ children }) => {
  const healthMonitor = useRealtimeHealth();
  
  // Deterministic channel ID for logging
  const channelIdRef = useRef(`shared-${Date.now()}-${Math.random().toString(36).slice(-4)}`);
  
  const [connectionState, setConnectionState] = useState<SharedRealtimeState>({
    isConnected: false,
    connectionStatus: 'disconnected',
    error: null,
    lastUpdated: null,
    subscribers: new Set(),
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscriptionsRef = useRef<Map<string, { config: TableSubscriptionConfig; callback: RealtimeCallback }>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3; // 🔥 REDUCED from 5 to 3 attempts
  const baseReconnectDelay = 8000; // 🔥 INCREASED from 3s to 8s base delay

  // PHASE 3: Single shared connection for all Realtime needs WITH CONNECTION STABILIZER
  const connect = useCallback(() => {
    // Extra safety: Never attempt connect unless we have active subscriptions
    if (subscriptionsRef.current.size === 0) {
      if (isDevToolsEnabled()) {
        console.log('SharedRealtime - No subscribers, skipping connect');
      }
      return;
    }

    if (connectionState.connectionStatus === 'connected' || connectionState.connectionStatus === 'connecting') {
      if (isDevToolsEnabled()) {
        console.log('SharedRealtime - Already connected or connecting, skipping');
      }
      return;
    }

    if (isDevToolsEnabled()) {
      console.log(`WS-SHARED: SUBSCRIBE [${channelIdRef.current}] with ${subscriptionsRef.current.size} subscribers`);
    }
    setConnectionState(prev => ({ ...prev, connectionStatus: 'connecting', error: null }));
    
    const channel = supabase.channel('shared-realtime-connection');
    
    // Add all current subscribers to the channel
    subscriptionsRef.current.forEach(({ config, callback }) => {
      (channel as any).on('postgres_changes', { 
        event: config.event || 'INSERT', 
        schema: config.schema || 'public', 
        table: config.table 
      }, callback);
    });
    
    channel.subscribe((status) => {
      if (isDevToolsEnabled()) {
        console.log('SharedRealtime - Connection status:', status);
      }
      
      if (status === 'SUBSCRIBED') {
        if (isDevToolsEnabled()) {
          console.log(`WS-SHARED: SUBSCRIBE [${channelIdRef.current}] name=shared-realtime-connection`);
        }
        setConnectionState(prev => ({ ...prev, connectionStatus: 'connected', error: null }));
        healthMonitor.registerConnection('SharedRealtime');
      } else if (status === 'CHANNEL_ERROR') {
        setConnectionState(prev => ({ 
          ...prev, 
          connectionStatus: 'error', 
          error: 'Failed to connect to realtime'
        }));
        scheduleReconnect();
      }
    });

    channelRef.current = channel;
  }, [healthMonitor]);

  const disconnect = useCallback(() => {
    if (channelRef.current) {
      if (isDevToolsEnabled()) {
        console.log(`WS-SHARED: UNSUBSCRIBE [${channelIdRef.current}]`);
      }
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setConnectionState(prev => ({ ...prev, connectionStatus: 'disconnected', error: null }));
      healthMonitor.unregisterConnection('SharedRealtime');
    }
  }, [healthMonitor]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current || reconnectAttempts.current >= maxReconnectAttempts) {
      return;
    }

    // 🔥 DRASTICALLY REDUCED RECONNECTION FREQUENCY - 5x slower minimum
    const delay = Math.max(baseReconnectDelay * Math.pow(2.5, reconnectAttempts.current), 10000); // Minimum 10 seconds
    const jitter = delay * 0.15 * Math.random();
    const totalDelay = Math.min(delay + jitter, 120000); // Cap at 2 minutes instead of 30s

    if (isDevToolsEnabled()) {
      console.log(`🔄 SharedRealtime reconnecting in ${Math.round(totalDelay/1000)}s (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttempts.current++;
      reconnectTimeoutRef.current = null;
      connect();
    }, totalDelay);
  }, [connect]);

  // PHASE 3: Optimized subscription management
  const subscribeToTable = useCallback((
    config: TableSubscriptionConfig, 
    callback: RealtimeCallback
  ): (() => void) => {
    const key = `${config.table}|${config.event || 'INSERT'}|${config.filter || ''}`;
    
    // Add to subscriptions map
    subscriptionsRef.current.set(key, { config, callback });
    
    // Update subscriber count
    setConnectionState(prev => ({
      ...prev,
      subscribers: new Set([...prev.subscribers, key])
    }));

    // Add to existing channel if connected
    if (channelRef.current) {
      (channelRef.current as any).on(
        'postgres_changes',
        {
          event: config.event || 'INSERT',
          schema: config.schema || 'public',
          table: config.table,
          ...(config.filter && { filter: config.filter })
        },
        callback
      );
    }

    // Connect if we have subscribers and not connected
    if (connectionState.connectionStatus === 'disconnected' && subscriptionsRef.current.size === 1) {
      connect();
    }

    if (isDevToolsEnabled()) {
      console.log(`📝 SharedRealtime: Subscribed to ${config.table} (${subscriptionsRef.current.size} total)`);
    }

    // Return unsubscribe function
    return () => {
      subscriptionsRef.current.delete(key);
      
      setConnectionState(prev => {
        const newSubscribers = new Set(prev.subscribers);
        newSubscribers.delete(key);
        return { ...prev, subscribers: newSubscribers };
      });

      // Disconnect if no more subscribers
      if (subscriptionsRef.current.size === 0) {
        disconnect();
      }

      if (isDevToolsEnabled()) {
        console.log(`📝 SharedRealtime: Unsubscribed from ${config.table} (${subscriptionsRef.current.size} remaining)`);
      }
    };
  }, [connectionState.connectionStatus, connect, disconnect]);

  const getConnectionHealth = useCallback(() => ({
    isHealthy: connectionState.isConnected,
    connectionCount: subscriptionsRef.current.size
  }), [connectionState.isConnected]);

  // Network recovery
  useEffect(() => {
    const handleOnline = () => {
      if (!connectionState.isConnected && subscriptionsRef.current.size > 0) {
        if (isDevToolsEnabled()) {
          console.log('🌐 SharedRealtime: Network recovered, reconnecting');
        }
        reconnectAttempts.current = 0;
        setTimeout(connect, 1000);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [connectionState.isConnected, connect]);

  // Cleanup on unmount
  useEffect(() => {
    healthMonitor.registerConnection('SharedRealtime');
    return () => {
      healthMonitor.unregisterConnection('SharedRealtime');
      disconnect();
    };
  }, [healthMonitor, disconnect]);

  const contextValue = useMemo<SharedRealtimeContextType>(() => ({
    connectionState,
    subscribeToTable,
    getConnectionHealth
  }), [connectionState, subscribeToTable, getConnectionHealth]);

  return (
    <SharedRealtimeContext.Provider value={contextValue}>
      {children}
    </SharedRealtimeContext.Provider>
  );
};