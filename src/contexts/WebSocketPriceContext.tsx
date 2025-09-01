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
  // Enhanced price consistency methods
  subscribeToPriceUpdates: (callback: (symbol: string, priceData: PriceData) => void) => () => void;
  validatePriceConsistency: (symbol: string, reportedPrice: number) => { isConsistent: boolean; deviation?: number };
  // Trading safety methods
  getPriceAge: (symbol: string) => number | null; // Age in milliseconds
  isPriceStale: (symbol: string, maxAgeSeconds?: number) => boolean;
  getConnectionHealth: () => { isHealthy: boolean; lastUpdate: Date | null; stalePrices: string[] };
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
  
  // Enhanced price consistency state - single source of truth
  const masterPricesRef = useRef<Record<string, PriceData>>({});
  const lastPriceBroadcastRef = useRef<Record<string, number>>({});
  const priceUpdateCallbacksRef = useRef<Set<(symbol: string, priceData: PriceData) => void>>(new Set());
  const priceDeviationLogRef = useRef<Record<string, { reportedPrice: number; actualPrice: number; timestamp: number }[]>>({});

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

  // Enhanced HTTP polling with price validation and staleness detection
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
        
        // Process each price update with validation and staleness checks
        Object.entries(response.data.prices).forEach(([symbol, priceInfo]: [string, any]) => {
          if (priceInfo && priceInfo.price && !isNaN(priceInfo.price) && priceInfo.price > 0) {
            const normalizedSymbol = normalizeSymbol(symbol);
            
            // Critical: Validate price freshness (reject stale prices)
            const priceTimestamp = new Date(priceInfo.timestamp || new Date()).getTime();
            const currentTime = Date.now();
            const priceAge = currentTime - priceTimestamp;
            
            if (priceAge > 10000) { // Reject prices older than 10 seconds
              console.warn(`⚠️ Rejecting stale price for ${normalizedSymbol}: ${priceAge}ms old`);
              setErrors(prev => ({ ...prev, [normalizedSymbol]: `Price data is ${Math.floor(priceAge/1000)}s old` }));
              return;
            }
            
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
              tick_timestamp: currentTime,
              is_institutional_tick: false,
              is_ultra_fast_tick: true, // Mark as ultra-fast for 1-second polling
              update_frequency: '1s'
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
          
          // Broadcast price updates to all subscribers for consistency
          Object.entries(newPrices).forEach(([symbol, priceData]) => {
            priceUpdateCallbacksRef.current.forEach(callback => {
              try {
                callback(symbol, priceData);
              } catch (error) {
                console.warn('Error in price update callback:', error);
              }
            });
          });
          
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
    
    // Set up regular polling (1 second intervals for critical trading)
    httpPollingIntervalRef.current = setInterval(() => {
      const currentSymbols = Array.from(subscribedSymbolsRef.current);
      if (currentSymbols.length > 0) {
        pollPricesHTTP(currentSymbols);
      }
    }, 1000); // Critical: 1-second polling for active signals
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

  // Enhanced price consistency methods
  const subscribeToPriceUpdates = useCallback((callback: (symbol: string, priceData: PriceData) => void) => {
    priceUpdateCallbacksRef.current.add(callback);
    console.log('📡 Price update subscriber added, total subscribers:', priceUpdateCallbacksRef.current.size);
    
    // Return unsubscribe function
    return () => {
      priceUpdateCallbacksRef.current.delete(callback);
      console.log('📡 Price update subscriber removed, total subscribers:', priceUpdateCallbacksRef.current.size);
    };
  }, []);

  const validatePriceConsistency = useCallback((symbol: string, reportedPrice: number) => {
    const normalized = normalizeSymbol(symbol);
    const actualPrice = masterPricesRef.current[normalized]?.price || prices[normalized]?.price;
    
    if (!actualPrice || actualPrice === 0) {
      return { isConsistent: true }; // No baseline to compare against
    }
    
    const deviation = Math.abs((reportedPrice - actualPrice) / actualPrice) * 100;
    const isConsistent = deviation <= 0.1; // 0.1% tolerance for price consistency
    
    if (!isConsistent) {
      // Log deviation for monitoring
      if (!priceDeviationLogRef.current[normalized]) {
        priceDeviationLogRef.current[normalized] = [];
      }
      
      const deviationEntry = {
        reportedPrice,
        actualPrice,
        timestamp: Date.now()
      };
      
      priceDeviationLogRef.current[normalized].push(deviationEntry);
      
      // Keep only last 10 deviations per symbol
      if (priceDeviationLogRef.current[normalized].length > 10) {
        priceDeviationLogRef.current[normalized] = priceDeviationLogRef.current[normalized].slice(-10);
      }
      
      console.warn(`💸 Price deviation detected for ${normalized}:`, {
        reported: reportedPrice,
        actual: actualPrice,
        deviation: `${deviation.toFixed(3)}%`
      });
    }
    
    return { isConsistent, deviation: isConsistent ? undefined : deviation };
  }, [normalizeSymbol, prices]);

  // Trading safety methods
  const getPriceAge = useCallback((symbol: string): number | null => {
    const normalized = normalizeSymbol(symbol);
    const priceData = masterPricesRef.current[normalized] || prices[normalized];
    if (!priceData || !priceData.tick_timestamp) return null;
    
    return Date.now() - priceData.tick_timestamp;
  }, [normalizeSymbol, prices]);

  const isPriceStale = useCallback((symbol: string, maxAgeSeconds: number = 30): boolean => {
    const age = getPriceAge(symbol);
    return age === null || age > (maxAgeSeconds * 1000);
  }, [getPriceAge]);

  const getConnectionHealth = useCallback(() => {
    const stalePrices: string[] = [];
    const currentTime = Date.now();
    
    // Check all subscribed symbols for staleness
    Array.from(subscribedSymbolsRef.current).forEach(symbol => {
      const priceData = masterPricesRef.current[symbol] || prices[symbol];
      if (!priceData || !priceData.tick_timestamp || (currentTime - priceData.tick_timestamp) > 30000) {
        stalePrices.push(symbol);
      }
    });
    
    const isHealthy = connectionStatus === 'connected' && stalePrices.length === 0 && lastUpdated && (currentTime - lastUpdated.getTime()) < 10000;
    
    return {
      isHealthy,
      lastUpdate: lastUpdated,
      stalePrices
    };
  }, [connectionStatus, lastUpdated, prices]);

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
    subscribeToPriceUpdates,
    validatePriceConsistency,
    getPriceAge,
    isPriceStale,
    getConnectionHealth,
  };

  return (
    <WebSocketPriceContext.Provider value={contextValue}>
      {children}
    </WebSocketPriceContext.Provider>
  );
};