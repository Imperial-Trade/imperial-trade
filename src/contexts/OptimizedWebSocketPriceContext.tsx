import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { isDevToolsEnabled } from '@/utils/featureFlags';

// Enhanced price data interface with bid/ask support
interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
  bid?: number;
  ask?: number;
  mid?: number;
}

// Unified WebSocket context type with all features
interface OptimizedWebSocketContextType {
  prices: Record<string, PriceData>;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
  getPrice: (symbol: string) => PriceData | null;
  isConnected: boolean;
  error: string | null;
  // Enhanced features from HybridWebSocketPriceContext
  dataSource: string;
  lastUpdated: Date | null;
  errors: Record<string, string>;
  refreshPrice: (symbol: string) => void;
  getConnectionHealth: () => { isHealthy: boolean; lastUpdate: Date | null };
  getStats?: () => { 
    messagesReceived: number; 
    reconnections: number; 
    avgLatency: number;
  };
  restartConnection: () => void;
  isUsingEnhancedSystem: boolean;
}

const OptimizedWebSocketContext = createContext<OptimizedWebSocketContextType | null>(null);

export const useOptimizedWebSocketPrices = () => {
  const context = useContext(OptimizedWebSocketContext);
  if (!context) {
    throw new Error('useOptimizedWebSocketPrices must be used within OptimizedWebSocketPriceProvider');
  }
  return context;
};

interface OptimizedWebSocketPriceProviderProps {
  children: React.ReactNode;
}

export const OptimizedWebSocketPriceProvider: React.FC<OptimizedWebSocketPriceProviderProps> = ({
  children
}) => {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Enhanced reconnection state
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [maxReconnectAttempts] = useState(10);
  const [baseReconnectDelay] = useState(1000); // Start with 1 second
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [heartbeatInterval, setHeartbeatInterval] = useState<NodeJS.Timeout | null>(null);
  const [reconnectTimer, setReconnectTimer] = useState<NodeJS.Timeout | null>(null);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscriptionsRef = useRef<Set<string>>(new Set());
  const messagesReceivedRef = useRef<number>(0);
  const prevStatusRef = useRef<string>('disconnected');
  const reconnectionsRef = useRef<number>(0);
  const latencySumRef = useRef<number>(0);
  const latencyCountRef = useRef<number>(0);

  const handleReconnect = useCallback(() => {
    if (isReconnecting || reconnectAttempt >= maxReconnectAttempts) return;
    
    setIsReconnecting(true);
    // Add jitter to exponential backoff (±25% random variance)
    const baseDelay = Math.min(baseReconnectDelay * Math.pow(2, reconnectAttempt), 30000);
    const jitter = baseDelay * 0.25 * (Math.random() - 0.5);
    const delay = Math.max(baseDelay + jitter, 100); // Min 100ms
    
    if (isDevToolsEnabled()) {
      console.log(`🔄 Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttempt + 1}/${maxReconnectAttempts})`);
    }
    
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    
    setReconnectTimer(setTimeout(() => {
      setReconnectAttempt(prev => prev + 1);
      reconnectionsRef.current += 1;
      disconnect();
      setTimeout(() => connect(), 100); // Small delay before reconnect
    }, delay));
  }, [isReconnecting, reconnectAttempt, maxReconnectAttempts, baseReconnectDelay, reconnectTimer]);

  const connect = useCallback(async () => {
    if (channelRef.current || connectionStatus === 'connecting' || isReconnecting) {
      return; // Already connected or connecting
    }

    if (isDevToolsEnabled()) {
      console.log('🔗 Connecting to Supabase Realtime...');
    }
    setConnectionStatus('connecting');
    setError(null);
    setIsReconnecting(false);

    try {
      // Create the live-prices-broadcast channel (matches price-ingestor)
      const channel = supabase.channel('live-prices-broadcast');
      channelRef.current = channel;

      // Set up listener for price updates
      channel.on('broadcast', { event: 'price_update' }, ({ payload }) => {
        if (isDevToolsEnabled()) {
          console.log('📈 Received price update:', payload);
        }
        messagesReceivedRef.current += 1;
        
        // Update last received timestamp for heartbeat monitoring
        setLastUpdated(payload.ts ? new Date(payload.ts) : new Date());
        
        // Calculate latency if timestamp is provided
        if (payload.ts) {
          const latency = Date.now() - new Date(payload.ts).getTime();
          latencySumRef.current += latency;
          latencyCountRef.current += 1;
        }
        
        // Only process if we're subscribed to this symbol
        if (subscriptionsRef.current.has(payload.symbol)) {
          const priceData: PriceData = {
            symbol: payload.symbol,
            price: payload.price,
            change: 0, // Will be calculated by DigitalOcean
            changePercent: 0, // Will be calculated by DigitalOcean
            timestamp: payload.ts || new Date().toISOString(),
            bid: payload.bid,
            ask: payload.ask,
            mid: payload.mid
          };
          setPrices(prev => ({ ...prev, [payload.symbol]: priceData }));
        }
      });

      // Subscribe to the channel
      channel.subscribe((status) => {
        if (isDevToolsEnabled()) {
          console.log('🔌 Realtime connection status:', status);
        }
        
        // Track reconnections (transition from non-connected to connected)
        if (status === 'SUBSCRIBED' && prevStatusRef.current !== 'SUBSCRIBED') {
          setReconnectAttempt(0); // Reset on successful connection
        }
        prevStatusRef.current = status;
        
        if (status === 'SUBSCRIBED') {
          if (isDevToolsEnabled()) {
            console.log('✅ Successfully connected to Supabase Realtime');
          }
          setConnectionStatus('connected');
          // Start heartbeat monitoring on successful connection
          startHeartbeat();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error(`❌ Realtime connection issue: ${status}`);
          setConnectionStatus('error');
          setError(`Connection failed: ${status}`);
          stopHeartbeat();
          channelRef.current = null; // Clear channel reference
          handleReconnect();
        }
      });
    } catch (error) {
      if (isDevToolsEnabled()) {
        console.error('❌ Connection setup failed:', error);
      }
      setConnectionStatus('error');
      setError('Failed to establish connection - please check your network');
      handleReconnect();
    }
  }, [connectionStatus, isReconnecting, handleReconnect]);

  // Heartbeat monitoring functions
  const startHeartbeat = useCallback(() => {
    stopHeartbeat(); // Clear any existing heartbeat
    const interval = setInterval(() => {
      if (connectionStatus === 'connected' && lastUpdated) {
        const staleness = Date.now() - lastUpdated.getTime();
        if (staleness > 40000) { // 40 seconds threshold
          if (isDevToolsEnabled()) {
            console.warn(`🔄 Price data stale (${Math.round(staleness/1000)}s), triggering reconnection`);
          }
          stopHeartbeat();
          channelRef.current = null; // Clear channel reference
          handleReconnect();
        }
      }
    }, 15000); // Check every 15 seconds
    setHeartbeatInterval(interval);
  }, [connectionStatus, lastUpdated, handleReconnect]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      setHeartbeatInterval(null);
    }
  }, [heartbeatInterval]);

  const disconnect = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    stopHeartbeat();
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      setReconnectTimer(null);
    }
    setConnectionStatus('disconnected');
    setIsReconnecting(false);
  }, [stopHeartbeat, reconnectTimer]);

  // Public method for admin tooling
  const restartConnection = useCallback(() => {
    if (isDevToolsEnabled()) {
      console.log('🔄 Manual restart requested');
    }
    setReconnectAttempt(0); // Reset backoff
    disconnect();
    setTimeout(() => connect(), 100);
  }, [disconnect, connect]);

  const subscribe = useCallback((symbols: string[]) => {
    // Add strict symbol validation and logging
    const validatedSymbols = symbols.filter(symbol => {
      const isValid = symbol && symbol.trim().length > 0;
      if (isDevToolsEnabled()) {
        console.log(`🎯 [Subscribe] Symbol: ${symbol} → Valid: ${isValid}`);
      }
      return isValid;
    });
    
    // Add to local subscription tracking - this is passive, just for filtering
    validatedSymbols.forEach(symbol => {
      if (isDevToolsEnabled()) {
        console.log(`📝 [Subscribe] Adding ${symbol} to subscription set`);
      }
      subscriptionsRef.current.add(symbol);
    });
    
    // Note: With Supabase Realtime, we don't need to send subscription messages
    // The DigitalOcean worker will broadcast all prices, and we filter locally
    if (isDevToolsEnabled()) {
      console.log(`✅ [Subscribe] Subscribed to symbols (passive filtering):`, validatedSymbols);
    }
  }, []);

  const unsubscribe = useCallback((symbols: string[]) => {
    // Remove from local subscription tracking
    symbols.forEach(symbol => {
      if (isDevToolsEnabled()) {
        console.log(`📝 [Unsubscribe] Removing ${symbol} from subscription set`);
      }
      subscriptionsRef.current.delete(symbol);
    });
    
    // Remove prices for unsubscribed symbols
    setPrices(prev => {
      const updated = { ...prev };
      symbols.forEach(symbol => delete updated[symbol]);
      return updated;
    });
    
    if (isDevToolsEnabled()) {
      console.log(`✅ [Unsubscribe] Unsubscribed from symbols:`, symbols);
    }
  }, []);

  const getPrice = useCallback((symbol: string): PriceData | null => {
    return prices[symbol] || null;
  }, [prices]);

  const refreshPrice = useCallback((symbol: string) => {
    // Refresh by re-subscribing
    unsubscribe([symbol]);
    setTimeout(() => subscribe([symbol]), 100);
  }, [subscribe, unsubscribe]);

  const getConnectionHealth = useCallback(() => ({
    isHealthy: connectionStatus === 'connected',
    lastUpdate: lastUpdated
  }), [connectionStatus, lastUpdated]);

  const getStats = useCallback(() => ({
    messagesReceived: messagesReceivedRef.current,
    reconnections: reconnectionsRef.current,
    avgLatency: latencyCountRef.current > 0 
      ? latencySumRef.current / latencyCountRef.current 
      : 50 // Fallback estimated latency
  }), []);

  // Network state listeners for fast recovery
  useEffect(() => {
    const handleOnline = () => {
      if (isDevToolsEnabled()) {
        console.log('🌐 Network back online, triggering reconnection');
      }
      if (connectionStatus !== 'connected') {
        setReconnectAttempt(0); // Reset attempts on network recovery
        connect();
      }
    };
    
    const handleVisibilityChange = () => {
      if (!document.hidden && connectionStatus !== 'connected') {
        if (isDevToolsEnabled()) {
          console.log('👁️ Tab visible again, checking connection');
        }
        // Small delay to avoid immediate reconnection spam
        setTimeout(() => {
          connect();
        }, 1000);
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connectionStatus, connect]);

  // Initialize connection on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  const contextValue: OptimizedWebSocketContextType = {
    prices,
    connectionStatus,
    subscribe,
    unsubscribe,
    getPrice,
    isConnected: connectionStatus === 'connected',
    error,
    // Enhanced features
    dataSource: 'Real-Time Data Only',
    lastUpdated,
    errors: error ? { general: error } : {},
    refreshPrice,
    getConnectionHealth,
    getStats,
    restartConnection,
    isUsingEnhancedSystem: true
  };

  return (
    <OptimizedWebSocketContext.Provider value={contextValue}>
      {children}
    </OptimizedWebSocketContext.Provider>
  );
};