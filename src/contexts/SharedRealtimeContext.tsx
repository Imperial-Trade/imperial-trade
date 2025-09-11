import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { isDevToolsEnabled } from '@/utils/featureFlags';
import { connectionStabilizer } from '@/utils/connectionStabilizer';
import { useRealtimeHealth } from './RealtimeHealthMonitor';
import { useRealtimeTelemetry } from '@/hooks/useRealtimeTelemetry';
import { useTelemetry } from '@/contexts/TelemetryContext';
import { realtimeLogger, generateChannelId } from '@/utils/realtimeLogger';

// Shared connection state to prevent multiple Realtime channels
interface SharedRealtimeState {
  isConnected: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  error: string | null;
  lastUpdated: Date | null;
  subscribers: number;
  sessionMessages: number;
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
  const { recordMessage, recordConnection } = useRealtimeTelemetry();
  const telemetry = useTelemetry();
  
  // 🔥 LEAK-PROOF: Deterministic channel ID for definitive logging
  const channelIdRef = useRef(generateChannelId('shared'));
  
  const [connectionState, setConnectionState] = useState<SharedRealtimeState>({
    isConnected: false,
    connectionStatus: 'disconnected',
    error: null,
    lastUpdated: null,
    subscribers: 0,
    sessionMessages: 0,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscriptionsRef = useRef<Map<string, { config: TableSubscriptionConfig; callback: RealtimeCallback }>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 2; // 🔥 FURTHER REDUCED from 3 to 2 attempts
  const baseReconnectDelay = 12000; // 🔥 INCREASED from 8s to 12s base delay
  const mountOnlyRef = useRef(false); // 🔥 LEAK-PROOF: Prevent reconnection after unmount

  // 🔥 LEAK-PROOF: Connection with mount guards and deterministic logging
  const connect = useCallback(() => {
    // 🔥 LEAK-PROOF: Block connection after component unmount
    if (!mountOnlyRef.current) {
      if (isDevToolsEnabled()) {
        console.log('SharedRealtime - Connect blocked: component unmounted');
      }
      return;
    }
    
    // Extra safety: Never attempt connect unless we have active subscriptions
    if (subscriptionsRef.current.size === 0) {
      if (isDevToolsEnabled()) {
        console.log('SharedRealtime - No subscribers, skipping connect');
      }
      return;
    }

    // 🔥 LEAK-PROOF: Prevent duplicate connections
    if (connectionState.connectionStatus === 'connected' || connectionState.connectionStatus === 'connecting' || channelRef.current) {
      if (isDevToolsEnabled()) {
        console.log('SharedRealtime - Already connected/connecting or channel exists, skipping');
      }
      return;
    }

    // 🔥 DEFINITIVE LOGGING: Always log subscription attempts
    realtimeLogger.logSubscribe(channelIdRef.current, 'shared-realtime-connection', 'SharedRealtimeProvider');
    
    setConnectionState(prev => ({ ...prev, connectionStatus: 'connecting', error: null }));
    
    const channel = supabase.channel('shared-realtime-connection');
    
    // Add all current subscribers to the channel
    subscriptionsRef.current.forEach(({ config, callback }) => {
      const wrappedCallback = (payload: any) => {
        // Health monitoring
        healthMonitor.recordRealtimeMessage('SharedRealtime', payload.eventType);
        
        // Record telemetry for per-channel tracking
        telemetry.record('db_change_v3');
        
        // Update session messages and lastUpdated
        setConnectionState(prev => ({
          ...prev,
          sessionMessages: prev.sessionMessages + 1,
          lastUpdated: new Date()
        }));
        
        callback(payload);
      };
      (channel as any).on('postgres_changes', { 
        event: config.event || 'INSERT', 
        schema: config.schema || 'public', 
        table: config.table 
      }, wrappedCallback);
    });
    
    channel.subscribe((status) => {
      if (isDevToolsEnabled()) {
        console.log('SharedRealtime - Connection status:', status);
      }
      
      if (status === 'SUBSCRIBED') {
        // 🔥 DEFINITIVE LOGGING: Connection established successfully
        recordConnection(); // PHASE C: Record successful connection
        setConnectionState(prev => ({ 
          ...prev, 
          connectionStatus: 'connected', 
          isConnected: true, 
          error: null,
          subscribers: subscriptionsRef.current.size
        }));
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

  // 🔥 LEAK-PROOF: Stable disconnect function with definitive logging
  const disconnect = useCallback(() => {
    if (channelRef.current) {
      // 🔥 DEFINITIVE LOGGING: Always log unsubscription
      realtimeLogger.logUnsubscribe(channelIdRef.current, 'SharedRealtimeProvider');
      
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setConnectionState(prev => ({ ...prev, connectionStatus: 'disconnected', isConnected: false, error: null }));
    }
  }, []); // 🔥 LEAK-PROOF: No dependencies to prevent stale closures

  const scheduleReconnect = useCallback(() => {
    // 🔥 LEAK-PROOF: Block reconnection after unmount
    if (!mountOnlyRef.current || reconnectTimeoutRef.current || reconnectAttempts.current >= maxReconnectAttempts) {
      return;
    }

    // 🔥 DRASTICALLY REDUCED RECONNECTION FREQUENCY - Even slower
    const delay = Math.max(baseReconnectDelay * Math.pow(3, reconnectAttempts.current), 15000); // Minimum 15 seconds
    const jitter = delay * 0.2 * Math.random();
    const totalDelay = Math.min(delay + jitter, 180000); // Cap at 3 minutes

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
      subscribers: subscriptionsRef.current.size + 1
    }));

    // Add to existing channel if connected
    if (channelRef.current) {
      const wrappedCallback = (payload: any) => {
        // Health monitoring
        healthMonitor.recordRealtimeMessage('SharedRealtime', payload.eventType);
        
        // Record telemetry for per-channel tracking
        telemetry.record('db_change_v3');
        
        // Update session messages and lastUpdated
        setConnectionState(prev => ({
          ...prev,
          sessionMessages: prev.sessionMessages + 1,
          lastUpdated: new Date()
        }));
        
        callback(payload);
      };
      (channelRef.current as any).on(
        'postgres_changes',
        {
          event: config.event || 'INSERT',
          schema: config.schema || 'public',
          table: config.table,
          ...(config.filter && { filter: config.filter })
        },
        wrappedCallback
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
      
      setConnectionState(prev => ({
        ...prev,
        subscribers: Math.max(0, prev.subscribers - 1)
      }));

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

  // 🔥 LEAK-PROOF: Mount-only lifecycle with definitive cleanup
  useEffect(() => {
    mountOnlyRef.current = true;
    
    realtimeLogger.logStatus('SharedRealtimeProvider MOUNT');
    healthMonitor.registerConnection('SharedRealtime');
    
    return () => {
      mountOnlyRef.current = false;
      
      realtimeLogger.logStatus('SharedRealtimeProvider UNMOUNT');
      
      // 🔥 LEAK-PROOF: Clear all timers first
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // 🔥 LEAK-PROOF: Force disconnect
      disconnect();
      
      healthMonitor.unregisterConnection('SharedRealtime');
    };
  }, []); // 🔥 LEAK-PROOF: Mount-only, never re-run

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