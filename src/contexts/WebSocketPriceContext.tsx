
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

interface PriceData {
  price: number;
  change: number;
  changePercent: number;
  timestamp: Date;
}

interface WebSocketPriceContextType {
  prices: Record<string, PriceData>;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
  getPrice: (symbol: string) => PriceData | null;
  refreshPrice: (symbol: string) => void;
  lastUpdated: Date | null;
  dataSource: string;
  errors: Record<string, string>;
}

const WebSocketPriceContext = createContext<WebSocketPriceContextType | null>(null);

interface WebSocketPriceProviderProps {
  children: React.ReactNode;
}

export const WebSocketPriceProvider: React.FC<WebSocketPriceProviderProps> = ({ children }) => {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const wsRef = useRef<WebSocket | null>(null);
  const subscribedSymbolsRef = useRef<Set<string>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  // Check WebSocket availability
  const isWebSocketAvailable = () => {
    if (typeof window === 'undefined') return false;
    
    try {
      return typeof WebSocket !== 'undefined' && WebSocket.constructor;
    } catch (error) {
      console.error('WebSocket constructor check failed:', error);
      return false;
    }
  };

  const connectWebSocket = useCallback(() => {
    if (!isWebSocketAvailable()) {
      console.error('WebSocket is not available in this environment');
      setConnectionStatus('error');
      setErrors(prev => ({ ...prev, websocket: 'WebSocket not supported' }));
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setConnectionStatus('connecting');
      console.log('🔌 Connecting to WebSocket price feed...');
      
      // Use a mock WebSocket URL for development
      const wsUrl = 'wss://echo.websocket.org/';
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        setConnectionStatus('connected');
        setErrors(prev => ({ ...prev, websocket: '' }));
        reconnectAttempts.current = 0;
        
        // Subscribe to existing symbols
        if (subscribedSymbolsRef.current.size > 0) {
          const symbols = Array.from(subscribedSymbolsRef.current);
          console.log('🔄 Re-subscribing to symbols:', symbols);
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'price_update' && data.data) {
            const updates: Record<string, PriceData> = {};
            
            data.data.forEach((update: any) => {
              if (update.symbol && update.price !== undefined) {
                updates[update.symbol] = {
                  price: update.price,
                  change: update.change || 0,
                  changePercent: update.changePercent || 0,
                  timestamp: new Date(update.timestamp || Date.now())
                };
              }
            });

            if (Object.keys(updates).length > 0) {
              setPrices(prev => ({ ...prev, ...updates }));
              setLastUpdated(new Date());
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          setErrors(prev => ({ ...prev, parse: 'Failed to parse message' }));
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('❌ WebSocket connection closed:', event.code, event.reason);
        setConnectionStatus('disconnected');
        
        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && reconnectAttempts.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connectWebSocket();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionStatus('error');
        setErrors(prev => ({ ...prev, websocket: 'Connection error' }));
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
      setErrors(prev => ({ 
        ...prev, 
        websocket: error instanceof Error ? error.message : 'Unknown WebSocket error' 
      }));
    }
  }, []);

  const subscribe = useCallback((symbols: string[]) => {
    console.log('📡 Subscribing to symbols:', symbols);
    
    symbols.forEach(symbol => {
      subscribedSymbolsRef.current.add(symbol);
    });

    if (connectionStatus === 'disconnected') {
      connectWebSocket();
    }

    // Send subscription message if connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          type: 'subscribe',
          symbols: symbols
        }));
      } catch (error) {
        console.error('Error sending subscription:', error);
      }
    }
  }, [connectionStatus, connectWebSocket]);

  const unsubscribe = useCallback((symbols: string[]) => {
    console.log('📡 Unsubscribing from symbols:', symbols);
    
    symbols.forEach(symbol => {
      subscribedSymbolsRef.current.delete(symbol);
    });

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          type: 'unsubscribe',
          symbols: symbols
        }));
      } catch (error) {
        console.error('Error sending unsubscription:', error);
      }
    }
  }, []);

  const getPrice = useCallback((symbol: string): PriceData | null => {
    return prices[symbol] || null;
  }, [prices]);

  const refreshPrice = useCallback((symbol: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          type: 'refresh',
          symbol: symbol
        }));
      } catch (error) {
        console.error('Error refreshing price:', error);
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, []);

  const contextValue: WebSocketPriceContextType = {
    prices,
    connectionStatus,
    subscribe,
    unsubscribe,
    getPrice,
    refreshPrice,
    lastUpdated,
    dataSource: 'WebSocket',
    errors
  };

  return (
    <WebSocketPriceContext.Provider value={contextValue}>
      {children}
    </WebSocketPriceContext.Provider>
  );
};

export const useWebSocketPrices = (): WebSocketPriceContextType => {
  const context = useContext(WebSocketPriceContext);
  if (!context) {
    throw new Error('useWebSocketPrices must be used within WebSocketPriceProvider');
  }
  return context;
};
