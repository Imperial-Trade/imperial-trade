import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
  bid?: number;
  ask?: number;
  // Ultra-fast institutional tick data
  tick_timestamp?: number;
  is_institutional_tick?: boolean;
  is_ultra_fast_tick?: boolean;
  update_frequency?: string;
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
  priceUpdateSources: Record<string, 'websocket' | 'websocket_institutional' | 'http'>;
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
  const [priceUpdateSources, setPriceUpdateSources] = useState<Record<string, 'websocket' | 'websocket_institutional' | 'http'>>({});
  
  const subscribedSymbolsRef = useRef<Set<string>>(new Set());
  const refCountsRef = useRef<Map<string, number>>(new Map());
  const httpPollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  
  // Price consistency state - single source of truth
  const masterPricesRef = useRef<Record<string, PriceData>>({});
  const lastPriceBroadcastRef = useRef<Record<string, number>>({});

  const normalizeSymbol = useCallback((s: string) => {
    const up = (s || '').toUpperCase().trim();
    
    // Create compact form for advanced matching
    const compact = up.replace(/[^A-Z0-9]/g, '');
    
    // Enhanced matching logic
    switch (up) {
      case 'GOLD':
      case 'XAU/USD':
        return 'XAUUSD';
      case 'BTC/USD':
        return 'BTCUSD';
      case 'US30':
      case 'USA30':
      case 'DOWJONES':
        return 'USA30USD';
      case 'NASDAQ':
      case 'NAS100':
        return 'NAS100USD';
      case 'SPX500':
      case 'SP500':
      case 'SPX':
        return 'SPX500USD';
      default:
        // Enhanced composite label fallback matching
        if (compact.includes('USA30') || compact.includes('US30') || compact.includes('DOWJONES')) {
          console.log(`🔄 Normalized composite '${s}' → 'USA30USD'`);
          return 'USA30USD';
        }
        if (compact.includes('NAS100') || compact.includes('NASDAQ100') || compact.includes('NASDAQ')) {
          console.log(`🔄 Normalized composite '${s}' → 'NAS100USD'`);
          return 'NAS100USD';
        }
        return compact;
    }
  }, []);

  // Enhanced HTTP polling with price consistency
  const pollPricesHTTP = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) return;

    try {
      console.log('📡 Polling prices via HTTP for:', symbols);
      
      const response = await supabase.functions.invoke('tradermade-streaming', {
        body: { symbols }
      });

      if (response.data?.success && response.data?.prices) {
        const newPrices: Record<string, PriceData> = {};
        const updateSources: Record<string, 'websocket' | 'websocket_institutional' | 'http'> = {};
        
        // Process each price update with consistency checking
        Object.entries(response.data.prices).forEach(([symbol, priceInfo]: [string, any]) => {
          if (priceInfo && priceInfo.price && !isNaN(priceInfo.price) && priceInfo.price > 0) {
            const normalizedSymbol = normalizeSymbol(symbol);
            
            // Calculate change if we have previous data
            const prevPrice = masterPricesRef.current[normalizedSymbol]?.price || priceInfo.price;
            const change = priceInfo.change ?? (priceInfo.price - prevPrice);
            const changePercent = priceInfo.changePercent ?? (prevPrice > 0 ? (change / prevPrice) * 100 : 0);
            
            const newPriceData: PriceData = {
              symbol: priceInfo.symbol || symbol,
              price: priceInfo.price,
              change,
              changePercent,
              timestamp: priceInfo.timestamp || new Date().toISOString(),
              bid: priceInfo.bid || priceInfo.price,
              ask: priceInfo.ask || priceInfo.price,
              tick_timestamp: Date.now(),
              is_institutional_tick: false,
              is_ultra_fast_tick: false,
              update_frequency: '5s'
            };
            
            // Price consistency check - only update if price actually changed
            const lastBroadcast = lastPriceBroadcastRef.current[normalizedSymbol];
            if (!lastBroadcast || Math.abs(newPriceData.price - lastBroadcast) > 0.00001) {
              newPrices[normalizedSymbol] = newPriceData;
              updateSources[normalizedSymbol] = 'http';
              lastPriceBroadcastRef.current[normalizedSymbol] = newPriceData.price;
              
              // Update master prices for consistency
              masterPricesRef.current[normalizedSymbol] = newPriceData;
              
              console.log(`💰 Price consistency update: ${normalizedSymbol} = $${newPriceData.price} (served_from: ${priceInfo.served_from || 'cache'})`);
            }
          }
        });
        
        // Batch update state for consistent prices across all components
        if (Object.keys(newPrices).length > 0) {
          setPrices(prev => ({ ...prev, ...newPrices }));
          setPriceUpdateSources(prev => ({ ...prev, ...updateSources }));
          setLastUpdated(new Date());
          setConnectionStatus('connected');
          setDataSource('tradermade');
          
          // Clear any errors
          setErrors(prev => {
            const cleaned = { ...prev };
            Object.keys(newPrices).forEach(symbol => {
              delete cleaned[symbol];
            });
            delete cleaned.global;
            return cleaned;
          });
        }

      } else {
        console.warn('❌ HTTP polling failed or returned invalid data');
        setConnectionStatus('error');
      }
    } catch (error) {
      console.error('❌ HTTP polling error:', error);
      setConnectionStatus('error');
      setErrors(prev => ({ ...prev, global: 'Price polling failed' }));
    }
  }, [normalizeSymbol]);

  // Start HTTP polling with consistent intervals
  const startHttpPolling = useCallback((symbols: string[]) => {
    if (isPollingRef.current) return;
    
    isPollingRef.current = true;
    console.log('🔄 Starting HTTP polling for symbols:', symbols);
    
    // Initial poll
    pollPricesHTTP(symbols);
    
    // Set up regular polling (5 second intervals for consistency)
    httpPollingIntervalRef.current = setInterval(() => {
      const currentSymbols = Array.from(subscribedSymbolsRef.current);
      if (currentSymbols.length > 0) {
        pollPricesHTTP(currentSymbols);
      }
    }, 5000);
  }, [pollPricesHTTP]);

  const stopHttpPolling = useCallback(() => {
    if (httpPollingIntervalRef.current) {
      clearInterval(httpPollingIntervalRef.current);
      httpPollingIntervalRef.current = null;
    }
    isPollingRef.current = false;
    console.log('⏹️ HTTP polling stopped');
  }, []);

  const connect = useCallback(() => {
    console.log('📡 Initializing HTTP-based price connection');
    setConnectionStatus('connecting');
    setDataSource('tradermade');
    
    // Process any pending subscriptions immediately
    if (subscribedSymbolsRef.current.size > 0) {
      const symbols = Array.from(subscribedSymbolsRef.current);
      console.log('📡 Starting HTTP polling for existing subscriptions:', symbols);
      startHttpPolling(symbols);
    }
    
    setConnectionStatus('connected');
    console.log('✅ HTTP polling mode established');
  }, [startHttpPolling]);

  const subscribe = useCallback((symbols: string[]) => {
    console.log('📡 Subscribe request received for symbols:', symbols);

    // Normalize and validate symbols
    const normalized = symbols
      .map(normalizeSymbol)
      .filter(Boolean);

    // Reference-counted subscriptions
    const toSubscribe: string[] = [];
    normalized.forEach(symbol => {
      const currentCount = refCountsRef.current.get(symbol) || 0;
      refCountsRef.current.set(symbol, currentCount + 1);
      
      if (currentCount === 0) {
        // First subscription for this symbol
        subscribedSymbolsRef.current.add(symbol);
        toSubscribe.push(symbol);
      }
    });

    if (toSubscribe.length > 0) {
      console.log('📡 New symbols to subscribe:', toSubscribe);
      
      // Start polling if not already started
      if (!isPollingRef.current) {
        startHttpPolling(toSubscribe);
      } else {
        // Poll immediately for new symbols
        pollPricesHTTP(toSubscribe);
      }
    }
  }, [normalizeSymbol, startHttpPolling, pollPricesHTTP]);

  const unsubscribe = useCallback((symbols: string[]) => {
    const normalized = symbols.map(normalizeSymbol).filter(Boolean);
    
    normalized.forEach(symbol => {
      const currentCount = refCountsRef.current.get(symbol) || 0;
      if (currentCount <= 1) {
        refCountsRef.current.delete(symbol);
        subscribedSymbolsRef.current.delete(symbol);
      } else {
        refCountsRef.current.set(symbol, currentCount - 1);
      }
    });

    // Stop polling if no subscriptions
    if (subscribedSymbolsRef.current.size === 0) {
      stopHttpPolling();
    }
  }, [normalizeSymbol, stopHttpPolling]);

  const getPrice = useCallback((symbol: string): PriceData | null => {
    const normalized = normalizeSymbol(symbol);
    return masterPricesRef.current[normalized] || prices[normalized] || null;
  }, [normalizeSymbol, prices]);

  const refreshPrice = useCallback((symbol: string) => {
    const normalized = normalizeSymbol(symbol);
    console.log('🔄 Refreshing price for:', normalized);
    pollPricesHTTP([normalized]);
  }, [normalizeSymbol, pollPricesHTTP]);

  // Initialize connection on mount
  useEffect(() => {
    connect();
    
    return () => {
      stopHttpPolling();
    };
  }, [connect, stopHttpPolling]);

  // Sync master prices with state
  useEffect(() => {
    Object.entries(prices).forEach(([symbol, priceData]) => {
      masterPricesRef.current[symbol] = priceData;
    });
  }, [prices]);

  const contextValue: WebSocketContextType = {
    prices,
    connectionStatus,
    dataSource,
    lastUpdated,
    errors,
    priceUpdateSources,
    subscribe,
    unsubscribe,
    getPrice,
    refreshPrice,
  };

  return (
    <WebSocketPriceContext.Provider value={contextValue}>
      {children}
    </WebSocketPriceContext.Provider>
  );
};