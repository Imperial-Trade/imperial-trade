import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

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

    socket.onopen = () => {
      console.log('✅ Connected to optimized WebSocket');
      setConnectionStatus('connected');
      setError(null);
      reconnectAttempts.current = 0;

      // Re-subscribe to any previous subscriptions
      if (subscriptionsRef.current.size > 0) {
        socket.send(JSON.stringify({
          type: 'subscribe',
          symbols: Array.from(subscriptionsRef.current),
          clearPrevious: true
        }));
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'connected':
            console.log('📡 WebSocket connection established');
            break;
            
          case 'subscribed':
            console.log('📈 Subscribed to symbols:', data.symbols);
            if (data.prices) {
              setPrices(prev => ({ ...prev, ...data.prices }));
            }
            break;
            
          case 'price_updates':
            // Fast price updates - directly update state
            setPrices(prev => ({ ...prev, ...data.updates }));
            break;
            
          case 'pong':
            // Health check response
            break;
            
            case 'error':
            console.error('❌ WebSocket error:', data.message);
            setError(data.message);
            break;
            
          case 'unsubscribe_ack':
            // Silent acknowledgment - no logging needed
            break;
            
          default:
            // Only log unknown message types that aren't expected
            if (!['unsubscribed', 'unsubscribe_ack'].includes(data.type)) {
              console.log('📦 Unknown message type:', data.type);
            }
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
    
    // Send subscription message if connected
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'subscribe',
        symbols,
        clearPrevious: false
      }));
    }
  }, []);

  const unsubscribe = useCallback((symbols: string[]) => {
    // Remove from local subscription tracking
    symbols.forEach(symbol => subscriptionsRef.current.delete(symbol));
    
    // Send unsubscription message if connected
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        symbols
      }));
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
      if (socketRef.current?.readyState === WebSocket.OPEN) {
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