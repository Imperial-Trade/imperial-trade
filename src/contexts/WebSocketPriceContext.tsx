import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  
  const subscribedSymbolsRef = useRef<Set<string>>(new Set());
  const socketRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');
    console.log('🔗 Connecting to efficient price broadcaster...');
    
    try {
      // Connect to our efficient broadcaster instead of individual API calls
      const wsUrl = `wss://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/live-price-broadcaster`;
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        console.log('✅ Connected to efficient price broadcaster');
        setConnectionStatus('connected');
        setDataSource('twelve_data_api');
        
        // Subscribe to existing symbols
        if (subscribedSymbolsRef.current.size > 0) {
          const symbols = Array.from(subscribedSymbolsRef.current);
          console.log('📡 Subscribing to efficient broadcast for:', symbols);
          socketRef.current?.send(JSON.stringify({
            type: 'subscribe',
            symbols
          }));
        }
      };

      socketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'price_update' && data.data) {
            const updates: Record<string, PriceData> = {};
            
            data.data.forEach((update: any) => {
              updates[update.symbol] = {
                symbol: update.symbol,
                price: update.price,
                change: update.change,
                changePercent: update.changePercent,
                timestamp: update.timestamp
              };
            });
            
            setPrices(prev => ({
              ...prev,
              ...updates
            }));
            
            setLastUpdated(new Date());
            setErrors(prev => {
              const newErrors = { ...prev };
              Object.keys(updates).forEach(symbol => {
                delete newErrors[symbol];
              });
              return newErrors;
            });
            
            console.log(`💰 Received broadcast update for ${Object.keys(updates).length} symbols from ${data.clients || 'unknown'} total clients`);
          }
        } catch (error) {
          console.error('❌ Error parsing broadcast message:', error);
        }
      };

      socketRef.current.onclose = () => {
        console.log('🔌 Disconnected from price broadcaster');
        setConnectionStatus('disconnected');
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (subscribedSymbolsRef.current.size > 0) {
            console.log('🔄 Attempting to reconnect to broadcaster...');
            connect();
          }
        }, 5000);
      };

      socketRef.current.onerror = (error) => {
        console.error('❌ Broadcaster connection error:', error);
        setConnectionStatus('error');
      };
      
    } catch (error) {
      console.error('❌ Failed to connect to price broadcaster:', error);
      setConnectionStatus('error');
    }
  }, []);

  const subscribe = useCallback((symbols: string[]) => {
    console.log('📈 Subscribing to efficient price broadcast for:', symbols);
    
    // Normalize symbols (convert GOLD to XAU/USD)
    const normalizedSymbols = symbols.map(symbol => 
      symbol === 'GOLD' ? 'XAU/USD' : symbol
    );
    
    normalizedSymbols.forEach(symbol => subscribedSymbolsRef.current.add(symbol));
    
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'subscribe',
        symbols: normalizedSymbols
      }));
    } else {
      connect();
    }
  }, [connect]);

  const unsubscribe = useCallback((symbols: string[]) => {
    symbols.forEach(symbol => subscribedSymbolsRef.current.delete(symbol));
    
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        symbols
      }));
    }
    
    setErrors(prev => {
      const newErrors = { ...prev };
      symbols.forEach(symbol => {
        delete newErrors[symbol];
      });
      return newErrors;
    });
  }, []);

  const refreshPrice = useCallback((symbol: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      // Request immediate update for this symbol
      socketRef.current.send(JSON.stringify({
        type: 'subscribe',
        symbols: [symbol]
      }));
    }
  }, []);

  const getPrice = useCallback((symbol: string): PriceData | null => {
    return prices[symbol] || null;
  }, [prices]);

  useEffect(() => {
    return () => {
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