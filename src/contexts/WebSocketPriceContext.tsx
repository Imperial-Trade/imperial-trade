
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

interface WebSocketContextType {
  prices: Record<string, PriceData>;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
  getPrice: (symbol: string) => PriceData | null;
  pauseUpdates: () => void;
  resumeUpdates: () => void;
  refreshPrice: (symbol: string) => void;
  lastUpdated: Date | null;
}

const WebSocketPriceContext = createContext<WebSocketContextType | null>(null);

export const useWebSocketPrices = () => {
  const context = useContext(WebSocketPriceContext);
  if (!context) {
    throw new Error('useWebSocketPrices must be used within WebSocketPriceProvider');
  }
  return context;
};

interface Props {
  children: React.ReactNode;
}

export const WebSocketPriceProvider: React.FC<Props> = ({ children }) => {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [connectionStatus, setConnectionStatus] = useState<WebSocketContextType['connectionStatus']>('disconnected');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [updateInterval, setUpdateInterval] = useState(8000); // Default 8 seconds
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscribedSymbolsRef = useRef<Set<string>>(new Set());
  const reconnectAttemptsRef = useRef(0);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Exponential backoff for reconnection
  const getReconnectDelay = useCallback(() => {
    const baseDelay = 3000;
    const maxDelay = 30000;
    const delay = Math.min(baseDelay * Math.pow(2, reconnectAttemptsRef.current), maxDelay);
    return delay;
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN || isPaused) {
      return;
    }

    setConnectionStatus('connecting');
    
    try {
      const wsUrl = `wss://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/live-price-stream`;
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        console.log('WebSocket connected');
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0; // Reset on successful connection
        
        // Re-subscribe to symbols after reconnection
        if (subscribedSymbolsRef.current.size > 0) {
          const symbols = Array.from(subscribedSymbolsRef.current);
          socketRef.current?.send(JSON.stringify({
            type: 'subscribe',
            symbols,
            interval: updateInterval
          }));
        }
      };

      socketRef.current.onmessage = (event) => {
        if (isPaused) return; // Skip updates when paused
        
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'price_update') {
            const updates: PriceData[] = message.data;
            setPrices(prev => {
              const newPrices = { ...prev };
              let hasSignificantChange = false;
              
              updates.forEach(update => {
                const existing = prev[update.symbol];
                // Only update if price changed by more than 0.1% or it's the first update
                if (!existing || Math.abs(update.changePercent) > 0.1) {
                  newPrices[update.symbol] = update;
                  hasSignificantChange = true;
                }
              });
              
              if (hasSignificantChange) {
                setLastUpdated(new Date());
              }
              
              return hasSignificantChange ? newPrices : prev;
            });
          } else if (message.type === 'error') {
            console.error('WebSocket error:', message.message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      socketRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectionStatus('disconnected');
        
        // Implement exponential backoff for reconnection
        if (!isPaused) {
          const delay = getReconnectDelay();
          reconnectAttemptsRef.current++;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      socketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        reconnectAttemptsRef.current++;
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
    }
  }, [updateInterval, isPaused, getReconnectDelay]);

  const subscribe = useCallback((symbols: string[]) => {
    symbols.forEach(symbol => subscribedSymbolsRef.current.add(symbol));
    
    if (socketRef.current?.readyState === WebSocket.OPEN && !isPaused) {
      socketRef.current.send(JSON.stringify({
        type: 'subscribe',
        symbols,
        interval: updateInterval
      }));
    } else if (!isPaused) {
      connect();
    }
  }, [connect, updateInterval, isPaused]);

  const unsubscribe = useCallback((symbols: string[]) => {
    symbols.forEach(symbol => subscribedSymbolsRef.current.delete(symbol));
    
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        symbols
      }));
    }
  }, []);

  const pauseUpdates = useCallback(() => {
    setIsPaused(true);
    setUpdateInterval(15000); // Slower updates when paused
    
    // Clear any existing pause timeout
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
    }
    
    // Auto-resume after 10 seconds of inactivity
    pauseTimeoutRef.current = setTimeout(() => {
      resumeUpdates();
    }, 10000);
  }, []);

  const resumeUpdates = useCallback(() => {
    setIsPaused(false);
    setUpdateInterval(8000); // Normal update frequency
    
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
    
    // Reconnect if needed
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      connect();
    }
  }, [connect]);

  const refreshPrice = useCallback((symbol: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'refresh',
        symbol
      }));
    }
  }, []);

  const getPrice = useCallback((symbol: string): PriceData | null => {
    return prices[symbol] || null;
  }, [prices]);

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const value: WebSocketContextType = {
    prices,
    connectionStatus,
    subscribe,
    unsubscribe,
    getPrice,
    pauseUpdates,
    resumeUpdates,
    refreshPrice,
    lastUpdated
  };

  return (
    <WebSocketPriceContext.Provider value={value}>
      {children}
    </WebSocketPriceContext.Provider>
  );
};
