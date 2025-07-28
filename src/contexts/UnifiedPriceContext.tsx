import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
  dataSource: string;
  volume?: number;
}

interface UnifiedPriceContextType {
  prices: Map<string, PriceData>;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastUpdated: Date | null;
  error: string | null;
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
  getPrice: (symbol: string) => PriceData | null;
  refreshPrices: (symbols: string[]) => void;
}

const UnifiedPriceContext = createContext<UnifiedPriceContextType | null>(null);

export const useUnifiedPrice = () => {
  const context = useContext(UnifiedPriceContext);
  if (!context) {
    throw new Error('useUnifiedPrice must be used within UnifiedPriceProvider');
  }
  return context;
};

interface Props {
  children: React.ReactNode;
}

export const UnifiedPriceProvider: React.FC<Props> = ({ children }) => {
  const [prices, setPrices] = useState<Map<string, PriceData>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState<UnifiedPriceContextType['connectionStatus']>('disconnected');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscribedSymbolsRef = useRef<Set<string>>(new Set());
  const priceUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const getReconnectDelay = useCallback(() => {
    const baseDelay = 3000;
    const maxDelay = 15000;
    return Math.min(baseDelay * Math.pow(2, reconnectAttemptsRef.current), maxDelay);
  }, []);

  // HTTP fallback for price fetching
  const fetchPricesHTTP = useCallback(async (symbols: string[]) => {
    try {
      console.log('📊 HTTP fallback: fetching prices for', symbols);
      
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/unified-price-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NjkyNTAsImV4cCI6MjA2NzQ0NTI1MH0.gvBGgPvvOYwMI9g8H5Cm9rKFB02G6z4tHIHEepKf7MI',
        },
        body: JSON.stringify({ symbols })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 HTTP response data:', data);
      
      if (data.prices && data.prices.length > 0) {
        setPrices(prevPrices => {
          const newPrices = new Map(prevPrices);
          data.prices.forEach((priceData: PriceData) => {
            newPrices.set(priceData.symbol, priceData);
          });
          return newPrices;
        });
        
        setLastUpdated(new Date());
        setConnectionStatus('connected');
        setError(null);
        console.log('✅ HTTP fallback successful');
      }
    } catch (error) {
      console.error('❌ HTTP price fetch failed:', error);
      setConnectionStatus('error');
      setError(`Failed to fetch prices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');
    
    // Try HTTP fallback immediately for better user experience
    if (subscribedSymbolsRef.current.size > 0) {
      console.log('📊 Starting immediate HTTP fallback');
      fetchPricesHTTP(Array.from(subscribedSymbolsRef.current));
    }
    
    try {
      const wsUrl = `wss://kmuoqkcxguafxulqlbmi.functions.supabase.co/unified-price-stream`;
      console.log('🔌 Connecting to Unified WebSocket:', wsUrl);
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        console.log('✅ Unified WebSocket connected');
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
        setError(null);
        
        // Subscribe to symbols
        if (subscribedSymbolsRef.current.size > 0) {
          console.log('📡 Subscribing to symbols:', Array.from(subscribedSymbolsRef.current));
          socketRef.current?.send(JSON.stringify({
            type: 'subscribe',
            symbols: Array.from(subscribedSymbolsRef.current)
          }));
        }
      };

      socketRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📡 Unified WebSocket message:', message);
          
          if (message.type === 'price_update' && message.data) {
            setPrices(prevPrices => {
              const newPrices = new Map(prevPrices);
              message.data.forEach((priceData: PriceData) => {
                console.log(`🔥 Real-time update: ${priceData.symbol} = $${priceData.price} (${priceData.dataSource})`);
                newPrices.set(priceData.symbol, priceData);
              });
              return newPrices;
            });
            setLastUpdated(new Date());
            setError(null);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      socketRef.current.onclose = () => {
        console.log('🔌 Unified WebSocket disconnected');
        setConnectionStatus('disconnected');
        
        const delay = getReconnectDelay();
        reconnectAttemptsRef.current++;
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };

      socketRef.current.onerror = (error) => {
        console.error('🔌 Unified WebSocket error:', error);
        setConnectionStatus('error');
        reconnectAttemptsRef.current++;
        
        // Fallback to HTTP if WebSocket fails
        if (subscribedSymbolsRef.current.size > 0) {
          console.log('📊 Attempting HTTP fallback...');
          fetchPricesHTTP(Array.from(subscribedSymbolsRef.current));
        }
      };
    } catch (error) {
      console.error('🔌 Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
    }
  }, [getReconnectDelay, fetchPricesHTTP]);

  const subscribe = useCallback((symbols: string[]) => {
    console.log('📡 Subscribing to symbols:', symbols);
    
    symbols.forEach(symbol => subscribedSymbolsRef.current.add(symbol));
    
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'subscribe',
        symbols
      }));
    } else {
      // Try HTTP fallback immediately
      fetchPricesHTTP(symbols);
      connect();
    }

    // Set up automatic price refresh every 30 seconds as backup to WebSocket
    if (priceUpdateIntervalRef.current) {
      clearInterval(priceUpdateIntervalRef.current);
    }
    
    priceUpdateIntervalRef.current = setInterval(() => {
      if (subscribedSymbolsRef.current.size > 0) {
        // Only use HTTP backup if WebSocket is not connected
        if (socketRef.current?.readyState !== WebSocket.OPEN) {
          console.log('📊 WebSocket disconnected, using HTTP backup');
          fetchPricesHTTP(Array.from(subscribedSymbolsRef.current));
        }
      }
    }, 30000); // 30-second backup for when WebSocket fails
  }, [connect, fetchPricesHTTP]);

  const unsubscribe = useCallback((symbols: string[]) => {
    console.log('📤 Unsubscribing from symbols:', symbols);
    
    symbols.forEach(symbol => subscribedSymbolsRef.current.delete(symbol));
    setError(null);
    
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        symbols
      }));
    }

    // Clear interval if no symbols are subscribed
    if (subscribedSymbolsRef.current.size === 0 && priceUpdateIntervalRef.current) {
      clearInterval(priceUpdateIntervalRef.current);
      priceUpdateIntervalRef.current = null;
      console.log('📊 Stopped auto-refresh timer');
    }
  }, []);

  const getPrice = useCallback((symbol: string): PriceData | null => {
    return prices.get(symbol) || null;
  }, [prices]);

  const refreshPrices = useCallback((symbols: string[]) => {
    setError(null);
    fetchPricesHTTP(symbols);
  }, [fetchPricesHTTP]);

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (priceUpdateIntervalRef.current) {
        clearInterval(priceUpdateIntervalRef.current);
      }
    };
  }, []);

  const value: UnifiedPriceContextType = {
    prices,
    connectionStatus,
    lastUpdated,
    error,
    subscribe,
    unsubscribe,
    getPrice,
    refreshPrices
  };

  return (
    <UnifiedPriceContext.Provider value={value}>
      {children}
    </UnifiedPriceContext.Provider>
  );
};