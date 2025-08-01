import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
  bid?: number;
  ask?: number;
}

interface ErrorData {
  type: 'error';
  message: string;
  code?: 'API_KEY_MISSING' | 'API_UNAVAILABLE' | 'SYMBOL_UNSUPPORTED' | 'RATE_LIMIT_EXCEEDED';
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
  const websocketHealthRef = useRef<{ lastSuccessfulMessage: number, isHealthy: boolean }>({ lastSuccessfulMessage: 0, isHealthy: false });

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
      // Connect to Tradermade streaming WebSocket
      const wsUrl = `wss://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/tradermade-streaming`;
      console.log('🔌 Connecting to Tradermade WebSocket:', wsUrl);
      console.log('🔍 WebSocket readyState before connection:', socketRef.current?.readyState);
      
      socketRef.current = new WebSocket(wsUrl);
      console.log('🆕 Created new WebSocket instance');

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
          console.log('📡 Subscribing to symbols:', symbols);
          socketRef.current?.send(JSON.stringify({
            action: 'subscribe',
            symbols: symbols
          }));
        }
      };

      socketRef.current.onmessage = (event) => {
        console.log('📨 Raw WebSocket message:', event.data);
        
        try {
          const data = JSON.parse(event.data);
          console.log('📊 Parsed message:', data);
          
          if (data.type === 'connection_status') {
            console.log('🔗 Connection status update:', data.status);
            const status = data.status === 'connected' ? 'connected' : 
                          data.status === 'connecting' ? 'connecting' : 'disconnected';
            setConnectionStatus(status);
            setDataSource(data.dataSource || 'tradermade');
            return;
          }
          
          if (data.type === 'price_update' && data.symbol && typeof data.price === 'number') {
            const symbol = data.symbol;
            console.log(`💰 LIVE PRICE UPDATE: ${symbol} = $${data.price}`);
            
            // Calculate percentage change if we have previous price
            const prevPrice = prices[symbol]?.price || data.price;
            const change = data.price - prevPrice;
            const changePercent = prevPrice > 0 ? (change / prevPrice) * 100 : 0;
            
            setPrices(prev => ({
              ...prev,
              [symbol]: {
                symbol: data.symbol,
                price: data.price,
                change: data.change || change,
                changePercent: data.changePercent || changePercent,
                timestamp: data.timestamp || new Date().toISOString(),
                bid: data.bid,
                ask: data.ask
              }
            }));
            
            setPriceUpdateSources(prev => ({ ...prev, [symbol]: 'websocket' }));
            setLastUpdated(new Date());
            websocketHealthRef.current.lastSuccessfulMessage = Date.now();
            websocketHealthRef.current.isHealthy = true;
            
            // Clear any symbol-specific errors
            setErrors(prev => {
              const { [symbol]: removed, ...rest } = prev;
              return rest;
            });
          } else if (data.type === 'error') {
            console.error('❌ WebSocket error message:', data.message);
            setErrors(prev => ({
              ...prev,
              global: data.message || 'WebSocket connection error'
            }));
            setConnectionStatus('error');
          } else {
            console.log('ℹ️ Unhandled message type:', data.type, data);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      socketRef.current.onclose = (event) => {
        console.log(`🔌 WebSocket disconnected: ${event.code} ${event.reason}`);
        setConnectionStatus('disconnected');
        websocketHealthRef.current.isHealthy = false;
        
        // Implement exponential backoff for reconnection
        const delay = getReconnectDelay();
        reconnectAttemptsRef.current++;
        
        console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Attempting reconnection...');
          connect();
        }, delay);
      };

      socketRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionStatus('error');
        websocketHealthRef.current.isHealthy = false;
        reconnectAttemptsRef.current++;
      };
    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
      setDataSource('unavailable');
    }
  }, [getReconnectDelay, prices]);

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
      console.log('📤 WebSocket ready, sending subscription');
      
      socketRef.current.send(JSON.stringify({
        action: 'subscribe',
        symbols: validatedSymbols
      }));
    } else {
      console.log('🔄 WebSocket not ready, attempting connection');
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
        action: 'unsubscribe',
        symbols
      }));
    }
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