
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  dataSource: 'tradermade' | 'unavailable';
  lastUpdated: Date | null;
  errors: Record<string, string>;
  priceUpdateSources: Record<string, 'websocket' | 'http'>;
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
  const [dataSource, setDataSource] = useState<'tradermade' | 'unavailable'>('unavailable');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [priceUpdateSources, setPriceUpdateSources] = useState<Record<string, 'websocket' | 'http'>>({});
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscribedSymbolsRef = useRef<Set<string>>(new Set());
  const reconnectAttemptsRef = useRef(0);
  const requestDeduplicationRef = useRef<Map<string, Promise<any>>>(new Map());
  const lastRequestTimeRef = useRef<Map<string, number>>(new Map());
  const circuitBreakerRef = useRef<{ failures: number, nextAttempt: number }>({ failures: 0, nextAttempt: 0 });
  const websocketHealthRef = useRef<{ lastSuccessfulMessage: number, isHealthy: boolean }>({ lastSuccessfulMessage: 0, isHealthy: false });

  const getReconnectDelay = useCallback(() => {
    const baseDelay = 5000;
    const maxDelay = 30000;
    const delay = Math.min(baseDelay * Math.pow(2, reconnectAttemptsRef.current), maxDelay);
    return delay;
  }, []);

  // Remove HTTP fallback - rely on WebSocket streaming only

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');
    
    try {
      // Connect to Tradermade streaming WebSocket  
      const wsUrl = `wss://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/tradermade-streaming`;
      console.log('🔌 Connecting to Tradermade WebSocket:', wsUrl);
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        console.log('✅ WebSocket connected to Tradermade streaming');
        setConnectionStatus('connected');
        setDataSource('tradermade');
        reconnectAttemptsRef.current = 0;
        websocketHealthRef.current = { lastSuccessfulMessage: Date.now(), isHealthy: true };
        
        // Clear any connection errors
        setErrors(prev => {
          const { global, ...rest } = prev;
          return global?.includes('WebSocket') ? rest : prev;
        });
        
        // Immediately subscribe to any pending symbols
        if (subscribedSymbolsRef.current.size > 0) {
          const symbols = Array.from(subscribedSymbolsRef.current);
          console.log('📡 Subscribing to Tradermade symbols:', symbols);
          socketRef.current?.send(JSON.stringify({
            action: 'subscribe',
            symbols: symbols
          }));
        }
      };

      socketRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📦 Received WebSocket message:', message);
          
          if (message.type === 'price_update') {
            // Handle single symbol updates from Tradermade
            const priceUpdate: PriceData = {
              symbol: message.symbol,
              price: message.price,
              change: message.change || 0,
              changePercent: message.changePercent || 0,
              timestamp: message.timestamp
            };
            
            // Mark WebSocket as healthy
            websocketHealthRef.current = { lastSuccessfulMessage: Date.now(), isHealthy: true };
            
            console.log(`💰 Tradermade Price Update: ${priceUpdate.symbol} = ${priceUpdate.price}`);
            
            setPrices(prev => ({
              ...prev,
              [priceUpdate.symbol]: priceUpdate
            }));
            
            // Track data source as WebSocket
            setPriceUpdateSources(prev => ({
              ...prev,
              [priceUpdate.symbol]: 'websocket'
            }));
            
            setDataSource('tradermade');
            setLastUpdated(new Date(priceUpdate.timestamp));
            
            // Clear any previous errors for this symbol
            setErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors[priceUpdate.symbol];
              return newErrors;
            });
            
          } else if (message.type === 'error') {
            const errorData = message as ErrorData;
            console.error('WebSocket price error:', errorData.message);
            
            // Special Gold error logging
            if (errorData.message.includes('XAU/USD') || errorData.message.includes('Gold')) {
              console.error('🥇 GOLD ERROR:', errorData.message);
            }
            
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
        console.log('Tradermade WebSocket disconnected');
        setConnectionStatus('disconnected');
        websocketHealthRef.current.isHealthy = false;
        
        // Implement exponential backoff for reconnection
        const delay = getReconnectDelay();
        reconnectAttemptsRef.current++;
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };

      socketRef.current.onerror = (error) => {
        console.error('Tradermade WebSocket error:', error);
        setConnectionStatus('error');
        websocketHealthRef.current.isHealthy = false;
        reconnectAttemptsRef.current++;
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
      setDataSource('unavailable');
    }
  }, [getReconnectDelay]);

  const subscribe = useCallback((symbols: string[]) => {
    console.log('📡 Subscribing to symbols:', symbols);
    
    // Validate and normalize symbols for Tradermade format
    const validatedSymbols = symbols.map(symbol => {
      const upperSymbol = symbol.toUpperCase().trim();
      console.log(`🔍 Symbol validation: ${symbol} -> ${upperSymbol}`);
      
      // Map frontend symbols to Tradermade format
      if (upperSymbol === 'GOLD' || upperSymbol === 'XAU/USD') {
        return 'XAUUSD';
      }
      if (upperSymbol === 'BITCOIN' || upperSymbol === 'BTC/USD') {
        return 'BTCUSD';
      }
      if (upperSymbol === 'US30' || upperSymbol === 'USA30') {
        return 'USA30';
      }
      if (upperSymbol === 'NAS100' || upperSymbol === 'NASDAQ') {
        return 'NAS100';
      }
      if (upperSymbol === 'EURUSD' || upperSymbol === 'EUR/USD') {
        return 'EURUSD';
      }
      return upperSymbol;
    }).filter(symbol => ['XAUUSD', 'BTCUSD', 'USA30', 'NAS100', 'EURUSD'].includes(symbol));
    
    console.log('✅ Validated Tradermade symbols:', validatedSymbols);
    
    validatedSymbols.forEach(symbol => subscribedSymbolsRef.current.add(symbol));
    
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      console.log('📤 WebSocket ready, sending Tradermade subscription');
      
      socketRef.current.send(JSON.stringify({
        action: 'subscribe',
        symbols: validatedSymbols
      }));
    } else {
      console.log('🔄 WebSocket not ready, attempting Tradermade connection');
      
      // Try WebSocket connection first
      connect();
    }

    // Rely on WebSocket real-time updates only
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
        action: 'unsubscribe',
        symbols
      }));
    }

    // No automatic polling to clear - we rely on WebSocket real-time updates
  }, []);

  const refreshPrice = useCallback((symbol: string) => {
    // Clear any existing error for this symbol
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[symbol];
      return newErrors;
    });
    
    // Force re-subscription for this symbol
    subscribe([symbol]);
  }, [subscribe]);

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
      // No polling intervals to clean up
    };
  }, []);

  const value: WebSocketContextType = {
    prices,
    connectionStatus,
    dataSource,
    lastUpdated,
    errors,
    priceUpdateSources,
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
