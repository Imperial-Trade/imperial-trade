import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Simple price data interface
interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

// Optimized context type - much simpler than the hybrid version
interface OptimizedWebSocketContextType {
  prices: Record<string, PriceData>;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
  getPrice: (symbol: string) => PriceData | null;
  isConnected: boolean;
  error: string | null;
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
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const subscriptionsRef = useRef<Set<string>>(new Set());
  const reconnectAttempts = useRef<number>(0);
  const isAuthenticatedRef = useRef<boolean>(false);

  // Optimized WebSocket URL - direct to our new edge function
  const WEBSOCKET_URL = 'wss://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/tradermade-streaming';

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    console.log('🔗 Connecting to optimized WebSocket...');
    setConnectionStatus('connecting');
    setError(null);

    const socket = new WebSocket(WEBSOCKET_URL);
    socketRef.current = socket;

    socket.onopen = async () => {
      console.log('✅ WebSocket opened, authenticating...');
      setConnectionStatus('connecting');
      setError(null);
      reconnectAttempts.current = 0;
      isAuthenticatedRef.current = false;

      // Send authentication message first (support both legacy and new schemas)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        
        // Primary: legacy-compatible schema
        socket.send(JSON.stringify({
          type: 'auth',
          token: token || null
        }));
        
        // Compatibility: also send newer action-based schema if server expects it
        try {
          socket.send(JSON.stringify({ action: 'auth', token: token || null }));
        } catch {}
      } catch (error) {
        console.error('❌ Authentication error:', error);
        setError('Authentication failed');
        setConnectionStatus('error');
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'welcome':
            console.log('🎉 WebSocket welcomed:', data.clientId || data.client_id);
            break;
          
          case 'connection_status':
            console.log('📡 Connection status:', data.status);
            break;
            
          case 'auth_success':
          case 'auth_response':
            if (data.success === false) {
              console.error('❌ Authentication failed:', data.message);
              setError(data.message || 'Authentication failed');
              setConnectionStatus('error');
            } else {
              console.log('🔑 Authentication successful');
              setConnectionStatus('connected');
              isAuthenticatedRef.current = true;
              // Re-subscribe to any previous subscriptions after authentication
              if (subscriptionsRef.current.size > 0) {
                const symbols = Array.from(subscriptionsRef.current);
                socket.send(JSON.stringify({ type: 'subscribe', symbols }));
                // Compatibility: also support action schema
                try { socket.send(JSON.stringify({ action: 'subscribe', symbols })); } catch {}
              }
            }
            break;
            
          case 'auth_error':
            console.error('❌ Authentication failed:', data.message);
            setError(data.message);
            setConnectionStatus('error');
            break;
            
          case 'subscription_ack':
          case 'subscription_response':
            console.log('✅ Subscription confirmed:', data.symbols || data.subscribedSymbols);
            break;
            
          case 'price_snapshot':
          case 'price_batch': {
            // Batch price updates from cache or snapshot
            const updates = data.updates || data.prices;
            if (Array.isArray(updates)) {
              const merged: Record<string, PriceData> = {};
              for (const u of updates) {
                const price = u.price ?? u.mid ?? ((u.bid !== undefined && u.ask !== undefined) ? (u.bid + u.ask) / 2 : undefined);
                if (u.symbol && price !== undefined) {
                  merged[u.symbol] = {
                    symbol: u.symbol,
                    price,
                    change: u.change || 0,
                    changePercent: u.changePercent || 0,
                    timestamp: u.timestamp || new Date().toISOString()
                  };
                }
              }
              if (Object.keys(merged).length > 0) {
                setPrices(prev => ({ ...prev, ...merged }));
                console.log('📈 Batch price update:', Object.keys(merged).length, 'symbols');
              }
            } else if (updates && typeof updates === 'object') {
              setPrices(prev => ({ ...prev, ...updates }));
              console.log('📈 Batch price update:', Object.keys(updates).length, 'symbols');
            }
            break;
          }
            
          case 'price_update':
            // Individual real-time price update
            if (data.symbol && data.price !== undefined) {
              const priceData: PriceData = {
                symbol: data.symbol,
                price: data.price,
                change: data.change || 0,
                changePercent: data.changePercent || 0,
                timestamp: data.timestamp || new Date().toISOString()
              };
              setPrices(prev => ({ ...prev, [data.symbol]: priceData }));
            } else if (data.update) {
              const u = data.update;
              const price = u.price ?? u.mid ?? ((u.bid !== undefined && u.ask !== undefined) ? (u.bid + u.ask) / 2 : undefined);
              if (u.symbol && price !== undefined) {
                const priceData: PriceData = {
                  symbol: u.symbol,
                  price,
                  change: u.change || 0,
                  changePercent: u.changePercent || 0,
                  timestamp: u.timestamp || new Date().toISOString()
                };
                setPrices(prev => ({ ...prev, [u.symbol]: priceData }));
              }
            }
            break;
            
          case 'pong':
            // Health check response
            break;
            
          case 'error':
            console.error('❌ WebSocket error:', data.message);
            setError(data.message);
            break;
            
          default:
            console.log('📦 Unknown message type:', data.type, data);
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    };

    socket.onclose = (event) => {
      console.log('🔌 WebSocket connection closed:', event.code, event.reason);
      setConnectionStatus('disconnected');
      
      // Automatic reconnection with simple backoff
      if (event.code !== 1000) { // Not a normal closure
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectAttempts.current++;
        
        console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
        reconnectTimeoutRef.current = window.setTimeout(connect, delay);
      }
    };

    socket.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setConnectionStatus('error');
      setError('Connection failed');
    };
  }, [WEBSOCKET_URL]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.close(1000, 'Manual disconnect');
      socketRef.current = null;
    }
    
    setConnectionStatus('disconnected');
  }, []);

  const subscribe = useCallback((symbols: string[]) => {
    // Add to local subscription tracking
    symbols.forEach(symbol => subscriptionsRef.current.add(symbol));
    
    // Send subscription message if connected and authenticated
    if (socketRef.current?.readyState === WebSocket.OPEN && isAuthenticatedRef.current) {
      // Primary: legacy-compatible schema
      socketRef.current.send(JSON.stringify({ type: 'subscribe', symbols }));
      // Compatibility: also support action-based schema
      try { socketRef.current.send(JSON.stringify({ action: 'subscribe', symbols })); } catch {}
    }
  }, []);

  const unsubscribe = useCallback((symbols: string[]) => {
    // Remove from local subscription tracking
    symbols.forEach(symbol => subscriptionsRef.current.delete(symbol));
    
    // Send unsubscription message if connected and authenticated
    if (socketRef.current?.readyState === WebSocket.OPEN && isAuthenticatedRef.current) {
      // Primary: legacy-compatible schema
      socketRef.current.send(JSON.stringify({ type: 'unsubscribe', symbols }));
      // Compatibility: also support action-based schema
      try { socketRef.current.send(JSON.stringify({ action: 'unsubscribe', symbols })); } catch {}
    }
    
    // Remove prices for unsubscribed symbols
    setPrices(prev => {
      const updated = { ...prev };
      symbols.forEach(symbol => delete updated[symbol]);
      return updated;
    });
  }, []);

  const getPrice = useCallback((symbol: string): PriceData | null => {
    return prices[symbol] || null;
  }, [prices]);

  // Initialize connection on mount
  useEffect(() => {
    connect();
    
    // Health check ping every 30 seconds
    const pingInterval = setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN && isAuthenticatedRef.current) {
        socketRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
    
    return () => {
      clearInterval(pingInterval);
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
    error
  };

  return (
    <OptimizedWebSocketContext.Provider value={contextValue}>
      {children}
    </OptimizedWebSocketContext.Provider>
  );
};