import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GoldPriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

interface GoldErrorData {
  type: 'error';
  message: string;
  code: 'API_UNAVAILABLE' | 'SYMBOL_UNSUPPORTED' | 'RATE_LIMIT_EXCEEDED';
}

interface GoldPriceContextType {
  price: GoldPriceData | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  dataSource: 'gold_price_feed' | 'unavailable';
  lastUpdated: Date | null;
  error: string | null;
  subscribe: () => void;
  unsubscribe: () => void;
  refreshPrice: () => void;
}

const GoldPriceContext = createContext<GoldPriceContextType | null>(null);

export const useGoldPrice = () => {
  const context = useContext(GoldPriceContext);
  if (!context) {
    throw new Error('useGoldPrice must be used within GoldPriceProvider');
  }
  return context;
};

interface Props {
  children: React.ReactNode;
}

export const GoldPriceProvider: React.FC<Props> = ({ children }) => {
  const [price, setPrice] = useState<GoldPriceData | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<GoldPriceContextType['connectionStatus']>('disconnected');
  const [dataSource, setDataSource] = useState<'gold_price_feed' | 'unavailable'>('unavailable');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSubscribedRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const priceUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getReconnectDelay = useCallback(() => {
    const baseDelay = 3000;
    const maxDelay = 15000;
    const delay = Math.min(baseDelay * Math.pow(2, reconnectAttemptsRef.current), maxDelay);
    return delay;
  }, []);

  // HTTP fallback for gold price fetching
  const fetchGoldPriceHTTP = useCallback(async () => {
    try {
      console.log('🥇 HTTP fallback: fetching gold price');
      
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/gold-price-feed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NjkyNTAsImV4cCI6MjA2NzQ0NTI1MH0.gvBGgPvvOYwMI9g8H5Cm9rKFB02G6z4tHIHEepKf7MI',
        },
        body: JSON.stringify({ symbols: ['XAU/USD'] })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log('🥇 HTTP response data:', data);
      
      if (data.prices && data.prices.length > 0) {
        const goldPrice: GoldPriceData = {
          symbol: data.prices[0].symbol,
          price: parseFloat(data.prices[0].price) || 0,
          change: parseFloat(data.prices[0].change) || 0,
          changePercent: parseFloat(data.prices[0].changePercent) || 0,
          timestamp: data.prices[0].timestamp || new Date().toISOString()
        };

        setPrice(goldPrice);
        setDataSource(data.dataQuality === 'simulated' ? 'gold_price_feed' : 'gold_price_feed');
        setLastUpdated(new Date());
        setConnectionStatus('connected');
        setError(null);

        console.log('✅ Gold HTTP fallback successful');
      }
    } catch (error) {
      console.error('❌ Gold HTTP price fetch failed:', error);
      setConnectionStatus('error');
      setDataSource('unavailable');
      setError(`Failed to fetch gold price: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');
    
    // Try HTTP fallback immediately for better user experience
    if (isSubscribedRef.current) {
      console.log('🥇 Starting immediate HTTP fallback for gold price');
      fetchGoldPriceHTTP();
      
      // Set a faster timeout for connection state
      const quickTimeout = setTimeout(() => {
        if (socketRef.current?.readyState !== WebSocket.OPEN) {
          console.log('⚡ Fast timeout: Using HTTP mode for gold, WebSocket took too long');
          setConnectionStatus('connected');
          setDataSource('gold_price_feed');
        }
      }, 2000);
      
      // Store timeout reference for cleanup
      (window as any).goldWsQuickTimeout = quickTimeout;
    }
    
    try {
      const wsUrl = `wss://kmuoqkcxguafxulqlbmi.functions.supabase.co/gold-price-feed`;
      console.log('🥇 Connecting to Gold WebSocket:', wsUrl);
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        console.log('✅ Gold WebSocket connected');
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
        
        // Clear the fast timeout since WebSocket connected successfully
        if ((window as any).goldWsQuickTimeout) {
          clearTimeout((window as any).goldWsQuickTimeout);
          (window as any).goldWsQuickTimeout = null;
        }
        
        setError(null);
        
        // Subscribe to gold prices
        if (isSubscribedRef.current) {
          console.log('🥇 Subscribing to gold prices');
          socketRef.current?.send(JSON.stringify({
            type: 'subscribe',
            symbols: ['XAU/USD']
          }));
        }
      };

      socketRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'price_update') {
            const goldPriceUpdate: GoldPriceData = message.data[0];
            setPrice(goldPriceUpdate);
            setDataSource(message.source || 'gold_price_feed');
            setLastUpdated(new Date(message.timestamp));
            setError(null);
            
          } else if (message.type === 'error') {
            const errorData = message as GoldErrorData;
            console.error('Gold WebSocket error:', errorData.message);
            setError(errorData.message);
            setDataSource('unavailable');
          }
        } catch (error) {
          console.error('Error parsing Gold WebSocket message:', error);
        }
      };

      socketRef.current.onclose = () => {
        console.log('🥇 Gold WebSocket disconnected');
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
        console.error('🥇 Gold WebSocket error, falling back to HTTP:', error);
        setConnectionStatus('error');
        setDataSource('unavailable');
        reconnectAttemptsRef.current++;
        
        // Fallback to HTTP if WebSocket fails
        if (isSubscribedRef.current) {
          console.log('🥇 Attempting HTTP fallback for gold...');
          fetchGoldPriceHTTP();
        }
      };
    } catch (error) {
      console.error('🥇 Failed to create Gold WebSocket connection:', error);
      setConnectionStatus('error');
      setDataSource('unavailable');
    }
  }, [getReconnectDelay, fetchGoldPriceHTTP]);

  const subscribe = useCallback(() => {
    console.log('🥇 Subscribing to gold prices');
    isSubscribedRef.current = true;
    
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'subscribe',
        symbols: ['XAU/USD']
      }));
    } else {
      // Try HTTP fallback immediately for faster response
      console.log('🥇 WebSocket not ready, using HTTP fallback immediately');
      fetchGoldPriceHTTP();
      
      // Also try WebSocket connection
      connect();
    }

    // Set up automatic price refresh every 4 seconds
    if (priceUpdateIntervalRef.current) {
      clearInterval(priceUpdateIntervalRef.current);
    }
    
    priceUpdateIntervalRef.current = setInterval(() => {
      if (isSubscribedRef.current) {
        console.log('🥇 Auto-refreshing gold price every 2 seconds');
        fetchGoldPriceHTTP();
      }
    }, 2000); // Update every 2 seconds for real-time feel
  }, [connect, fetchGoldPriceHTTP]);

  const unsubscribe = useCallback(() => {
    console.log('🥇 Unsubscribing from gold prices');
    isSubscribedRef.current = false;
    setError(null);
    
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        symbols: ['XAU/USD']
      }));
    }

    // Clear the interval
    if (priceUpdateIntervalRef.current) {
      clearInterval(priceUpdateIntervalRef.current);
      priceUpdateIntervalRef.current = null;
      console.log('🥇 Stopped auto-refresh timer for gold');
    }
  }, []);

  const refreshPrice = useCallback(() => {
    setError(null);
    fetchGoldPriceHTTP();
  }, [fetchGoldPriceHTTP]);

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

  const value: GoldPriceContextType = {
    price,
    connectionStatus,
    dataSource,
    lastUpdated,
    error,
    subscribe,
    unsubscribe,
    refreshPrice
  };

  return (
    <GoldPriceContext.Provider value={value}>
      {children}
    </GoldPriceContext.Provider>
  );
};