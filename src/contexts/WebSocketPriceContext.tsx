import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
  // Telemetry for debugging
  getFallbackTelemetry: () => { fallbackCount: number; lastFallbackReason: string | null };
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

// Client-side symbol allowlist for cost optimization
const ALLOWED_SYMBOLS = new Set(['XAUUSD', 'BTCUSD']);

export const WebSocketPriceProvider: React.FC<Props> = ({ children }) => {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [connectionStatus, setConnectionStatus] = useState<WebSocketContextType['connectionStatus']>('disconnected');
  const [dataSource, setDataSource] = useState<'tradermade' | 'unavailable'>('unavailable');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [priceUpdateSources, setPriceUpdateSources] = useState<Record<string, 'websocket' | 'websocket_institutional' | 'http'>>({});
  
  const subscribedSymbolsRef = useRef<Set<string>>(new Set());
  const refCountsRef = useRef<Map<string, number>>(new Map());
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 5;
  
  // Enhanced price consistency state - single source of truth
  const masterPricesRef = useRef<Record<string, PriceData>>({});
  const lastPriceBroadcastRef = useRef<Record<string, number>>({});
  const priceUpdateCallbacksRef = useRef<Set<(symbol: string, priceData: PriceData) => void>>(new Set());
  const priceDeviationLogRef = useRef<Record<string, { reportedPrice: number; actualPrice: number; timestamp: number }[]>>({});
  
  // Telemetry for debugging fallback behavior
  const fallbackTelemetryRef = useRef<{ fallbackCount: number; lastFallbackReason: string | null }>({
    fallbackCount: 0,
    lastFallbackReason: null
  });
  
  // Latched errors that should be cleared on successful reconnection or valid ticks
  const latchedErrorsRef = useRef<Set<string>>(new Set());

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

  // Enhanced HTTP fallback with bootstrap acceptance policy
  const pollPricesHTTP = useCallback(async (symbols: string[], options: { bootstrap?: boolean; forceFetch?: boolean } = {}) => {
    const { bootstrap = false, forceFetch = false } = options;
    
    // ALLOWLIST: Filter symbols to only allowed ones
    const allowedSymbols = symbols.filter(s => {
      const normalized = normalizeSymbol(s);
      return ALLOWED_SYMBOLS.has(normalized);
    });
    
    if (allowedSymbols.length === 0) return;
    
    console.log(`🔄 [Context] HTTP fallback ${bootstrap ? '(bootstrap)' : '(triggered)'}:`, allowedSymbols);
    
    // TELEMETRY: Count fallback attempts
    fallbackTelemetryRef.current.fallbackCount++;
    fallbackTelemetryRef.current.lastFallbackReason = bootstrap ? 'BOOTSTRAP' : 'TRIGGERED_FALLBACK';

    try {
      const response = await supabase.functions.invoke('tradermade-streaming', {
        body: {
          symbols: allowedSymbols,
          forceFetch: forceFetch
        }
      });

      if (response.data?.success && response.data?.prices) {
        const newPrices: Record<string, PriceData> = {};
        const updateSources: Record<string, 'websocket' | 'websocket_institutional' | 'http'> = {};
        
        Object.entries(response.data.prices).forEach(([symbol, priceInfo]: [string, any]) => {
          if (priceInfo && priceInfo.price && !isNaN(priceInfo.price) && priceInfo.price > 0) {
            const normalizedSymbol = normalizeSymbol(symbol);
            
            // GUARDRAIL: Bootstrap acceptance policy - accept ≤60s old for bootstrap, ≤10s for regular
            const priceTimestamp = new Date(priceInfo.timestamp || new Date()).getTime();
            const currentTime = Date.now();
            const priceAge = currentTime - priceTimestamp;
            const ageThreshold = bootstrap ? 60000 : 10000; // 60s for bootstrap, 10s for regular
            
            if (priceAge > ageThreshold) {
              console.warn(`⚠️ [Context] Rejecting ${bootstrap ? 'bootstrap' : 'stale'} price for ${normalizedSymbol}: ${priceAge}ms old`);
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
              is_ultra_fast_tick: false,
              update_frequency: bootstrap ? 'bootstrap' : 'http_fallback'
            };
            
            // Price consistency check
            const lastBroadcast = lastPriceBroadcastRef.current[normalizedSymbol];
            if (!lastBroadcast || Math.abs(newPriceData.price - lastBroadcast) > 0.00001) {
              newPrices[normalizedSymbol] = newPriceData;
              updateSources[normalizedSymbol] = 'http';
              lastPriceBroadcastRef.current[normalizedSymbol] = newPriceData.price;
              masterPricesRef.current[normalizedSymbol] = newPriceData;
              
              console.log(`💰 [Context] HTTP ${bootstrap ? 'bootstrap' : 'fallback'}: ${normalizedSymbol} = $${newPriceData.price}`);
            }
          }
        });
        
        if (Object.keys(newPrices).length > 0) {
          setPrices(prev => ({ ...prev, ...newPrices }));
          setPriceUpdateSources(prev => ({ ...prev, ...updateSources }));
          setLastUpdated(new Date());
          
          // Broadcast to subscribers
          Object.entries(newPrices).forEach(([symbol, priceData]) => {
            priceUpdateCallbacksRef.current.forEach(callback => {
              try {
                callback(symbol, priceData);
              } catch (error) {
                console.warn('Error in price update callback:', error);
              }
            });
          });
          
          // Clear errors on successful HTTP response
          setErrors(prev => {
            const cleaned = { ...prev };
            Object.keys(newPrices).forEach(symbol => delete cleaned[symbol]);
            if (!bootstrap) delete cleaned.global; // Don't clear global errors on bootstrap
            return cleaned;
          });
        }
      }
    } catch (error) {
      console.error('❌ [Context] HTTP fallback error:', error);
      // GUARDRAIL: Only set global error for non-bootstrap failures
      if (!bootstrap) {
        setErrors(prev => ({ ...prev, global: 'Price polling failed' }));
      }
    }
  }, [normalizeSymbol]);

  // Process real-time price updates from WebSocket relay
  const processRealtimePriceUpdate = useCallback((payload: any) => {
    if (!payload || !payload.symbol || !payload.bid || !payload.ask) {
      console.warn('❌ Invalid price update payload:', payload);
      return;
    }

    const normalizedSymbol = normalizeSymbol(payload.symbol);
    
    // ALLOWLIST: Only process allowed symbols
    if (!ALLOWED_SYMBOLS.has(normalizedSymbol)) {
      return;
    }
    
    // Only process if we're subscribed to this symbol
    if (!subscribedSymbolsRef.current.has(normalizedSymbol)) {
      return;
    }

    const currentTime = Date.now();
    const price = payload.mid || (payload.bid + payload.ask) / 2;
    
    // Calculate change if we have previous data
    const prevPrice = masterPricesRef.current[normalizedSymbol]?.price || price;
    const change = price - prevPrice;
    const changePercent = prevPrice > 0 ? (change / prevPrice) * 100 : 0;
    
    const newPriceData: PriceData = {
      symbol: payload.symbol,
      price,
      change,
      changePercent,
      timestamp: payload.timestamp || new Date().toISOString(),
      bid: payload.bid,
      ask: payload.ask,
      tick_timestamp: currentTime,
      is_institutional_tick: true,
      is_ultra_fast_tick: true,
      update_frequency: 'realtime'
    };

    // Price consistency check - only update if price actually changed
    const lastBroadcast = lastPriceBroadcastRef.current[normalizedSymbol];
    if (!lastBroadcast || Math.abs(newPriceData.price - lastBroadcast) > 0.00001) {
      setPrices(prev => ({ ...prev, [normalizedSymbol]: newPriceData }));
      setPriceUpdateSources(prev => ({ ...prev, [normalizedSymbol]: 'websocket' }));
      setLastUpdated(new Date());
      setConnectionStatus('connected');
      setDataSource('tradermade');
      
      lastPriceBroadcastRef.current[normalizedSymbol] = newPriceData.price;
      masterPricesRef.current[normalizedSymbol] = newPriceData;
      
      // Broadcast to subscribers
      priceUpdateCallbacksRef.current.forEach(callback => {
        try {
          callback(normalizedSymbol, newPriceData);
        } catch (error) {
          console.warn('Error in price update callback:', error);
        }
      });
      
            // Clear any errors for this symbol and global errors on successful update
            setErrors(prev => {
              const cleaned = { ...prev };
              delete cleaned[normalizedSymbol];
              delete cleaned.global; // Clear global errors on successful price updates
              
              // Clear latched errors on valid tick
              latchedErrorsRef.current.clear();
              
              return cleaned;
            });
      
      console.log(`💰 Realtime price update: ${normalizedSymbol} = $${newPriceData.price}`);
    }
  }, [normalizeSymbol]);

  // Reconnection with exponential backoff
  const attemptReconnection = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('🔥 Max reconnection attempts reached, giving up');
      setConnectionStatus('error');
      setErrors(prev => ({ ...prev, global: 'Connection failed after multiple attempts' }));
      return;
    }

    // Clear any existing timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000; // Exponential backoff
    console.log(`🔄 Attempting reconnection in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current += 1;
      cleanupRealtimeChannel();
      setupRealtimeChannel();
    }, delay);
  }, []);

  // Setup Realtime channel subscription with robust error handling
  const setupRealtimeChannel = useCallback(() => {
    if (realtimeChannelRef.current) {
      return; // Already connected
    }

    console.log(`📡 Setting up Realtime price channel (attempt ${reconnectAttemptsRef.current + 1})`);
    setConnectionStatus('connecting');
    
    const channel = supabase.channel('prices:live');
    
    channel
      .on('broadcast', { event: 'price_update' }, ({ payload }) => {
        processRealtimePriceUpdate(payload);
      })
      .subscribe((status) => {
        console.log(`📡 Realtime channel status: ${status}`);
        
        switch (status) {
          case 'SUBSCRIBED':
            console.log('✅ Connected to real-time price stream');
            setConnectionStatus('connected');
            setDataSource('tradermade');
            
            // Reset reconnection attempts on successful connection
            reconnectAttemptsRef.current = 0;
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
              reconnectTimeoutRef.current = null;
            }
            
            // Clear latched errors on SUBSCRIBED
            latchedErrorsRef.current.clear();
            
            // Clear global errors on successful connection
            setErrors(prev => {
              const cleaned = { ...prev };
              delete cleaned.global;
              return cleaned;
            });
            break;
            
          case 'CHANNEL_ERROR':
            console.error('❌ Channel error - attempting reconnection');
            
            // Check if we have fresh data - if so, don't surface error to UI
            const hasFreshData = Object.values(masterPricesRef.current).some(price => {
              const dataAge = (Date.now() - new Date(price.timestamp).getTime()) / 1000;
              return dataAge < 30;
            });
            
            if (!hasFreshData) {
              setConnectionStatus('error');
              setErrors(prev => ({ ...prev, global: 'Realtime connection error' }));
              latchedErrorsRef.current.add('CHANNEL_ERROR');
            }
            
            fallbackTelemetryRef.current.fallbackCount++;
            fallbackTelemetryRef.current.lastFallbackReason = 'CHANNEL_ERROR';
            attemptReconnection();
            break;
            
          case 'TIMED_OUT':
            console.error('⏰ Connection timed out - attempting reconnection');
            
            // Check if we have fresh data - if so, don't surface error to UI
            const hasRecentData = Object.values(masterPricesRef.current).some(price => {
              const dataAge = (Date.now() - new Date(price.timestamp).getTime()) / 1000;
              return dataAge < 30;
            });
            
            if (!hasRecentData) {
              setConnectionStatus('error');
              setErrors(prev => ({ ...prev, global: 'Connection timed out' }));
              latchedErrorsRef.current.add('TIMED_OUT');
            }
            
            fallbackTelemetryRef.current.fallbackCount++;
            fallbackTelemetryRef.current.lastFallbackReason = 'TIMED_OUT';
            attemptReconnection();
            break;
            
          case 'CLOSED':
            console.log('🔌 Connection closed');
            setConnectionStatus('disconnected');
            
            // Don't surface "Connection closed" as error if we have fresh data
            const hasActiveFreshData = Object.values(masterPricesRef.current).some(price => {
              const dataAge = (Date.now() - new Date(price.timestamp).getTime()) / 1000;
              return dataAge < 30;
            });
            
            if (!hasActiveFreshData) {
              setErrors(prev => ({ ...prev, global: 'Connection closed' }));
            }
            
            // Only attempt reconnection if we have active subscriptions
            if (subscribedSymbolsRef.current.size > 0) {
              console.log('🔄 Active subscriptions detected, attempting reconnection');
              attemptReconnection();
            } else {
              console.log('🔄 No active subscriptions, skipping reconnection');
            }
            break;
            
          default:
            console.log(`📡 Unhandled status: ${status}`);
        }
      });
    
    realtimeChannelRef.current = channel;
  }, [processRealtimePriceUpdate, attemptReconnection]);

  const cleanupRealtimeChannel = useCallback(() => {
    if (realtimeChannelRef.current) {
      console.log('🔌 Cleaning up Realtime price channel');
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
    
    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    console.log('📡 Initializing Realtime-based price connection');
    setupRealtimeChannel();
    
    // Initial data fetch for subscribed symbols with force fetch
    if (subscribedSymbolsRef.current.size > 0) {
      const symbols = Array.from(subscribedSymbolsRef.current);
      console.log('📡 Fetching initial data for subscribed symbols:', symbols);
      pollPricesHTTP(symbols, { forceFetch: true }); // Force fetch on initialization
    }
  }, [setupRealtimeChannel, pollPricesHTTP]);

  const subscribe = useCallback((symbols: string[]) => {
    console.log('📡 Subscribe request received for symbols:', symbols);

    // ALLOWLIST: Filter and normalize symbols, warn if any are dropped
    const normalized = symbols
      .map(normalizeSymbol)
      .filter(s => {
        if (!ALLOWED_SYMBOLS.has(s)) {
          console.warn(`🚫 Symbol ${s} not in allowlist, skipping`);
          return false;
        }
        return Boolean(s);
      });

    // Deduplication: Remove symbols that are already being subscribed to in this call
    const uniqueNormalized = [...new Set(normalized)];

    // Reference-counted subscriptions
    const toSubscribe: string[] = [];
    uniqueNormalized.forEach(symbol => {
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
      
      // For Realtime, we don't need to start anything specific per symbol
      // The relay will be handling all symbols and broadcasting to our channel
      // We just need to ensure our Realtime channel is connected
      if (!realtimeChannelRef.current) {
        setupRealtimeChannel();
      }
      
      // Optionally get initial price via HTTP for immediate feedback with force fetch
      pollPricesHTTP(toSubscribe, { bootstrap: true }); // Force fetch on first subscription
    }
  }, [normalizeSymbol, setupRealtimeChannel, pollPricesHTTP]);

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

    // Keep the Realtime channel always connected (no teardown on empty subscriptions)
    // Channel will be cleaned up only on provider unmount
  }, [normalizeSymbol, cleanupRealtimeChannel]);

  const getPrice = useCallback((symbol: string): PriceData | null => {
    const normalized = normalizeSymbol(symbol);
    return masterPricesRef.current[normalized] || prices[normalized] || null;
  }, [normalizeSymbol, prices]);

  const refreshPrice = useCallback((symbol: string) => {
    const normalized = normalizeSymbol(symbol);
    console.log('🔄 Refreshing price for:', normalized);
    pollPricesHTTP([normalized], { forceFetch: true });
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

  // GUARDRAIL: Enhanced staleness monitor and fallback trigger
  useEffect(() => {
    const interval = setInterval(() => {
      if (subscribedSymbolsRef.current.size === 0) return;
      
      let hasStaleData = false;
      let triggeredFallback = false;
      
      subscribedSymbolsRef.current.forEach(symbol => {
        const priceData = masterPricesRef.current[symbol];
        if (!priceData) return;
        
        const dataAge = (Date.now() - new Date(priceData.timestamp).getTime()) / 1000;
        
        // GUARDRAIL: Hard staleness cutoff at 25 seconds
        if (dataAge > 25 && !triggeredFallback) {
          console.log(`⚡ [Context] Hard staleness cutoff triggered for ${symbol}: ${dataAge.toFixed(1)}s`);
          fallbackTelemetryRef.current.fallbackCount++;
          fallbackTelemetryRef.current.lastFallbackReason = 'HARD_STALENESS_CUTOFF';
          pollPricesHTTP([symbol], { forceFetch: true });
          triggeredFallback = true;
        } else if (dataAge > 15) {
          hasStaleData = true;
        }
      });
      
      // GUARDRAIL: Don't surface connection errors if we have fresh data
      if (hasStaleData && connectionStatus === 'error') {
        const hasFreshData = Array.from(subscribedSymbolsRef.current).some(symbol => {
          const priceData = masterPricesRef.current[symbol];
          return priceData && (Date.now() - new Date(priceData.timestamp).getTime()) / 1000 < 15;
        });
        
        if (hasFreshData) {
          // Clear error state if we have fresh data
          setConnectionStatus('connected');
        }
      }
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, [connectionStatus, pollPricesHTTP]);

  // Initialize connection on mount with auto-connect
  useEffect(() => {
    connect();
    
    return () => {
      cleanupRealtimeChannel();
    };
  }, [connect, cleanupRealtimeChannel]);

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
    getConnectionHealth: (): { isHealthy: boolean; lastUpdate: Date | null; stalePrices: string[] } => {
      const stalePrices: string[] = [];
      const currentTime = Date.now();
      
      Object.entries(masterPricesRef.current).forEach(([symbol, priceData]) => {
        const priceAge = currentTime - new Date(priceData.timestamp).getTime();
        if (priceAge > 30000) { // 30 seconds
          stalePrices.push(symbol);
        }
      });
      
      return {
        isHealthy: connectionStatus === 'connected' && stalePrices.length === 0,
        lastUpdate: lastUpdated,
        stalePrices
      };
    },

    getFallbackTelemetry: () => ({
      fallbackCount: fallbackTelemetryRef.current.fallbackCount,
      lastFallbackReason: fallbackTelemetryRef.current.lastFallbackReason
    })
  };

  return (
    <WebSocketPriceContext.Provider value={contextValue}>
      {children}
    </WebSocketPriceContext.Provider>
  );
};
