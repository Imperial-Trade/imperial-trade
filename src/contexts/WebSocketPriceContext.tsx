
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

interface ErrorData {
  type: 'error';
  message: string;
  code: 'API_KEY_MISSING' | 'API_UNAVAILABLE' | 'SYMBOL_UNSUPPORTED' | 'RATE_LIMIT_EXCEEDED';
}

interface WebSocketContextType {
  prices: Record<string, PriceData>;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  dataSource: 'twelve_data_api' | 'unavailable';
  lastUpdated: Date | null;
  errors: Record<string, string>;
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
  getPrice: (symbol: string) => PriceData | null;
  refreshPrice: (symbol: string) => void;
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
  const [dataSource, setDataSource] = useState<'twelve_data_api' | 'unavailable'>('unavailable');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscribedSymbolsRef = useRef<Set<string>>(new Set());
  const reconnectAttemptsRef = useRef(0);

  const getReconnectDelay = useCallback(() => {
    const baseDelay = 5000;
    const maxDelay = 30000;
    const delay = Math.min(baseDelay * Math.pow(2, reconnectAttemptsRef.current), maxDelay);
    return delay;
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');
    
    try {
      const wsUrl = `wss://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/live-price-stream`;
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        console.log('WebSocket connected to live price stream');
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
        
        // Re-subscribe to symbols after reconnection
        if (subscribedSymbolsRef.current.size > 0) {
          const symbols = Array.from(subscribedSymbolsRef.current);
          socketRef.current?.send(JSON.stringify({
            type: 'subscribe',
            symbols
          }));
        }
      };

      socketRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'price_update') {
            const updates: PriceData[] = message.data;
            setPrices(prev => {
              const newPrices = { ...prev };
              updates.forEach(update => {
                newPrices[update.symbol] = update;
              });
              return newPrices;
            });
            
            setDataSource(message.source || 'twelve_data_api');
            setLastUpdated(new Date(message.timestamp));
            
            // Clear any previous errors for successfully updated symbols
            setErrors(prev => {
              const newErrors = { ...prev };
              updates.forEach(update => {
                delete newErrors[update.symbol];
              });
              return newErrors;
            });
            
          } else if (message.type === 'error') {
            const errorData = message as ErrorData;
            console.error('WebSocket price error:', errorData.message);
            
            // Set global error or symbol-specific error
            if (errorData.code === 'API_KEY_MISSING') {
              setDataSource('unavailable');
              setErrors({ global: errorData.message });
            } else {
              // Try to extract symbol from error message
              const symbolMatch = errorData.message.match(/for (\w+\/\w+)/);
              if (symbolMatch) {
                setErrors(prev => ({
                  ...prev,
                  [symbolMatch[1]]: errorData.message
                }));
              } else {
                setErrors(prev => ({ ...prev, global: errorData.message }));
              }
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      socketRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectionStatus('disconnected');
        setDataSource('unavailable');
        
        // Implement exponential backoff for reconnection
        const delay = getReconnectDelay();
        reconnectAttemptsRef.current++;
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };

      socketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        setDataSource('unavailable');
        reconnectAttemptsRef.current++;
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
      setDataSource('unavailable');
    }
  }, [getReconnectDelay]);

  const subscribe = useCallback((symbols: string[]) => {
    symbols.forEach(symbol => subscribedSymbolsRef.current.add(symbol));
    
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'subscribe',
        symbols
      }));
    } else {
      connect();
    }
  }, [connect]);

  const unsubscribe = useCallback((symbols: string[]) => {
    symbols.forEach(symbol => subscribedSymbolsRef.current.delete(symbol));
    
    // Clear errors for unsubscribed symbols
    setErrors(prev => {
      const newErrors = { ...prev };
      symbols.forEach(symbol => {
        delete newErrors[symbol];
      });
      return newErrors;
    });
    
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        symbols
      }));
    }
  }, []);

  const refreshPrice = useCallback((symbol: string) => {
    // For real API, we don't need manual refresh as data updates automatically
    // Just clear any existing error for this symbol
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[symbol];
      return newErrors;
    });
  }, []);

  const getPrice = useCallback((symbol: string): PriceData | null => {
    return prices[symbol] || null;
  }, [prices]);

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const value: WebSocketContextType = {
    prices,
    connectionStatus,
    dataSource,
    lastUpdated,
    errors,
    subscribe,
    unsubscribe,
    getPrice,
    refreshPrice
  };

  return (
    <WebSocketPriceContext.Provider value={value}>
      {children}
    </WebSocketPriceContext.Provider>
  );
};
