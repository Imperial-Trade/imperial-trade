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
  const priceUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // REST API fetching via HTTPS for live Gold prices
  const fetchPricesHTTP = useCallback(async (symbols: string[]) => {
    try {
      console.log('📡 REST API HTTPS: fetching live prices for', symbols);
      
      // Map symbols to standardized API format (ensure GOLD -> XAU/USD)
      const mappedSymbols = symbols.map(symbol => {
        if (symbol === 'GOLD' || symbol === 'XAU/USD') return 'XAU/USD';
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
        throw new Error(`HTTPS API Error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log('💰 Live Gold price data via HTTPS:', data);
      
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
        
        setDataSource('twelve_data_api');
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

        console.log('✅ REST API HTTPS successful, updated live prices for', updates.length, 'symbols');
      }
    } catch (error) {
      console.error('❌ REST API HTTPS price fetch failed:', error);
      setConnectionStatus('error');
      setDataSource('unavailable');
      setErrors(prev => ({ 
        ...prev, 
        global: `Failed to fetch live price data via HTTPS: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
    }
  }, []);

  const connect = useCallback(() => {
    // Use REST API polling instead of WebSocket for better reliability
    console.log('🔗 Connecting via REST API (HTTPS) for live Gold prices');
    setConnectionStatus('connected');
    setDataSource('twelve_data_api');
    
    // Immediately fetch prices for subscribed symbols
    if (subscribedSymbolsRef.current.size > 0) {
      const currentSymbols = Array.from(subscribedSymbolsRef.current);
      console.log('⚡ Starting immediate live price fetch for:', currentSymbols);
      fetchPricesHTTP(currentSymbols);
    }
  }, [fetchPricesHTTP]);

  const subscribe = useCallback((symbols: string[]) => {
    console.log('📈 Subscribing to live prices for:', symbols);
    
    // Normalize symbols (convert GOLD to XAU/USD for consistency)
    const normalizedSymbols = symbols.map(symbol => 
      symbol === 'GOLD' ? 'XAU/USD' : symbol
    );
    
    normalizedSymbols.forEach(symbol => subscribedSymbolsRef.current.add(symbol));
    
    // Use REST API polling for live prices via HTTPS
    console.log('💎 Using REST API (HTTPS) for live Gold prices:', normalizedSymbols);
    fetchPricesHTTP(normalizedSymbols);
    
    // Ensure connection is established for REST API mode
    if (connectionStatus !== 'connected') {
      connect();
    }

    // Set up REST API polling every 2 seconds for real-time Gold prices
    if (priceUpdateIntervalRef.current) {
      clearInterval(priceUpdateIntervalRef.current);
    }
    
    priceUpdateIntervalRef.current = setInterval(() => {
      if (subscribedSymbolsRef.current.size > 0) {
        const currentSymbols = Array.from(subscribedSymbolsRef.current);
        console.log('🔄 Live Gold price update via REST API every 2 seconds for:', currentSymbols);
        fetchPricesHTTP(currentSymbols);
      }
    }, 2000); // Fast polling every 2 seconds for live Gold prices
  }, [connect, fetchPricesHTTP, connectionStatus]);

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

    // If no symbols left, stop polling
    if (subscribedSymbolsRef.current.size === 0 && priceUpdateIntervalRef.current) {
      console.log('🛑 No symbols subscribed, stopping REST API polling');
      clearInterval(priceUpdateIntervalRef.current);
      priceUpdateIntervalRef.current = null;
    }
  }, []);

  const refreshPrice = useCallback((symbol: string) => {
    // Clear any existing error for this symbol
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[symbol];
      return newErrors;
    });
    
    // Force HTTPS fetch for this symbol
    console.log('🔄 Manually refreshing live price via HTTPS for:', symbol);
    fetchPricesHTTP([symbol]);
  }, [fetchPricesHTTP]);

  const getPrice = useCallback((symbol: string): PriceData | null => {
    return prices[symbol] || null;
  }, [prices]);

  useEffect(() => {
    return () => {
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