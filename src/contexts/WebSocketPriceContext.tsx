
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
  const priceUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getReconnectDelay = useCallback(() => {
    const baseDelay = 5000;
    const maxDelay = 30000;
    const delay = Math.min(baseDelay * Math.pow(2, reconnectAttemptsRef.current), maxDelay);
    return delay;
  }, []);

  // HTTP fallback for price fetching with standardized symbol mapping
  const fetchPricesHTTP = useCallback(async (symbols: string[]) => {
    try {
      console.log('🔄 HTTP fallback: fetching prices for', symbols);
      
      // Ensure all symbols are properly formatted for API
      const mappedSymbols = symbols.map(symbol => {
        if (symbol === 'BTC' || symbol === 'BITCOIN' || symbol === 'BTC/USD') return 'BTC/USD';
        return symbol;
      });

      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/get-market-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NjkyNTAsImV4cCI6MjA2NzQ0NTI1MH0.gvBGgPvvOYwMI9g8H5Cm9rKFB02G6z4tHIHEepKf7MI',
        },
        body: JSON.stringify({ symbols: mappedSymbols })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 HTTP response data:', data);
      
      if (data.prices && Array.isArray(data.prices)) {
        const updates: PriceData[] = data.prices.map((item: any) => ({
          symbol: item.symbol,
          price: parseFloat(item.price) || 0,
          change: parseFloat(item.change) || 0,
          changePercent: parseFloat(item.changePercent) || 0,
          timestamp: item.timestamp || new Date().toISOString()
        }));

        setPrices(prev => {
          const newPrices = { ...prev };
          updates.forEach(update => {
            newPrices[update.symbol] = update;
          });
          return newPrices;
        });
        
        setDataSource(data.dataQuality === 'simulated' ? 'unavailable' : 'twelve_data_api');
        setLastUpdated(new Date());
        setConnectionStatus('connected');
        
        // Clear errors for successfully updated symbols
        setErrors(prev => {
          const newErrors = { ...prev };
          updates.forEach(update => {
            delete newErrors[update.symbol];
          });
          if (data.warning) {
            newErrors.global = data.warning;
          }
          return newErrors;
        });

        console.log('✅ HTTP fallback successful, updated prices for', updates.length, 'symbols');
      }
    } catch (error) {
      console.error('❌ HTTP price fetch failed:', error);
      setConnectionStatus('error');
      setDataSource('unavailable');
      setErrors(prev => ({ 
        ...prev, 
        global: `Failed to fetch live price data: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
    }
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');
    
    // Try HTTP fallback immediately for better user experience
    if (subscribedSymbolsRef.current.size > 0) {
      const symbols = Array.from(subscribedSymbolsRef.current);
      console.log('🔄 Starting immediate HTTP fallback for symbols:', symbols);
      fetchPricesHTTP(symbols);
      
      // Set a faster timeout for connection state - if WebSocket doesn't connect in 2 seconds, stay with HTTP
      const quickTimeout = setTimeout(() => {
        if (socketRef.current?.readyState !== WebSocket.OPEN) {
          console.log('⚡ Fast timeout: Using HTTP mode, WebSocket took too long');
          setConnectionStatus('connected'); // Consider HTTP as connected
          setDataSource('twelve_data_api');
        }
      }, 2000); // Very fast 2-second timeout
      
      // Clear timeout on successful WebSocket connection
      const originalOnOpen = () => {
        clearTimeout(quickTimeout);
        console.log('✅ WebSocket connected - canceling HTTP-only mode');
      };
      
      // Store timeout reference for cleanup
      (window as any).wsQuickTimeout = quickTimeout;
    }
    
    try {
      // Correct WebSocket URL format for Supabase Edge Functions  
      const wsUrl = `wss://kmuoqkcxguafxulqlbmi.functions.supabase.co/live-price-stream`;
      console.log('🔌 Connecting to WebSocket:', wsUrl);
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        console.log('✅ WebSocket connected to live price stream');
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
        
        // Clear the fast timeout since WebSocket connected successfully
        if ((window as any).wsQuickTimeout) {
          clearTimeout((window as any).wsQuickTimeout);
          (window as any).wsQuickTimeout = null;
        }
        
        // Clear any connection errors
        setErrors(prev => {
          const { global, ...rest } = prev;
          return global?.includes('WebSocket') ? rest : prev;
        });
        
        // Re-subscribe to symbols after reconnection
        if (subscribedSymbolsRef.current.size > 0) {
          const symbols = Array.from(subscribedSymbolsRef.current);
          console.log('🔄 Re-subscribing to symbols:', symbols);
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
        console.error('WebSocket error, falling back to HTTP:', error);
        setConnectionStatus('error');
        setDataSource('unavailable');
        reconnectAttemptsRef.current++;
        
        // Fallback to HTTP if WebSocket fails
        if (subscribedSymbolsRef.current.size > 0) {
          console.log('Attempting HTTP fallback...');
          fetchPricesHTTP(Array.from(subscribedSymbolsRef.current));
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
      setDataSource('unavailable');
    }
  }, [getReconnectDelay]);

  const subscribe = useCallback((symbols: string[]) => {
    console.log('📡 Subscribing to symbols:', symbols);
    
    // Normalize symbols for BTC only
    const normalizedSymbols = symbols.map(symbol => 
      symbol === 'BITCOIN' ? 'BTC/USD' : symbol
    );
    
    normalizedSymbols.forEach(symbol => subscribedSymbolsRef.current.add(symbol));
    
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'subscribe',
        symbols: normalizedSymbols
      }));
    } else {
      // Try HTTP fallback immediately for faster response
      console.log('🔄 WebSocket not ready, using HTTP fallback immediately');
      fetchPricesHTTP(symbols);
      
      // Also try WebSocket connection
      connect();
    }

    // Set up automatic price refresh every 6 seconds
    if (priceUpdateIntervalRef.current) {
      clearInterval(priceUpdateIntervalRef.current);
    }
    
    priceUpdateIntervalRef.current = setInterval(() => {
      if (subscribedSymbolsRef.current.size > 0) {
        const currentSymbols = Array.from(subscribedSymbolsRef.current);
        console.log('🔄 Auto-refreshing prices every 6 seconds for:', currentSymbols);
        fetchPricesHTTP(currentSymbols);
      }
    }, 6000); // Update every 6 seconds
  }, [connect, fetchPricesHTTP]);

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

    // Clear the interval if no symbols are subscribed
    if (subscribedSymbolsRef.current.size === 0 && priceUpdateIntervalRef.current) {
      clearInterval(priceUpdateIntervalRef.current);
      priceUpdateIntervalRef.current = null;
      console.log('🔄 Stopped auto-refresh timer - no symbols subscribed');
    }
  }, []);

  const refreshPrice = useCallback((symbol: string) => {
    // Clear any existing error for this symbol
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[symbol];
      return newErrors;
    });
    
    // Force HTTP fetch for this symbol
    fetchPricesHTTP([symbol]);
  }, [fetchPricesHTTP]);

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
      if (priceUpdateIntervalRef.current) {
        clearInterval(priceUpdateIntervalRef.current);
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
