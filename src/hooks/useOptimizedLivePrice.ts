
import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocketPrices } from '@/contexts/WebSocketPriceContext';
import { supabase } from '@/integrations/supabase/client';
import { getStandardSymbol } from '@/types/assets';

interface OptimizedLivePriceData {
  price: number;
  change: number;
  changePercent: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  dataSource: 'tradermade' | 'unavailable';
  priceUpdateSource: 'websocket' | 'websocket_institutional' | 'http' | 'unknown';
  refreshPrice: () => void;
}

interface UseOptimizedLivePriceOptions {
  enableSmartPausing?: boolean;
  debounceMs?: number;
  pauseOnInput?: boolean;
}

export function useOptimizedLivePrice(
  symbol: string,
  options: UseOptimizedLivePriceOptions = {}
): OptimizedLivePriceData {
  const {
    debounceMs = 100 // Business Plan: Ultra-fast 100ms debouncing for real-time performance
  } = options;

  // Normalize symbol to ensure consistency
  const normalizedSymbol = getStandardSymbol(symbol) || symbol.toUpperCase();

  const {
    prices,
    connectionStatus,
    dataSource,
    lastUpdated: contextLastUpdated,
    errors,
    priceUpdateSources,
    subscribe,
    unsubscribe,
    getPrice,
    refreshPrice: contextRefreshPrice
  } = useWebSocketPrices();

  const [debouncedPrice, setDebouncedPrice] = useState({
    price: 0,
    change: 0,
    changePercent: 0
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [lastSignificantUpdate, setLastSignificantUpdate] = useState<Date | null>(null);
  const [lastNonZeroPrice, setLastNonZeroPrice] = useState<number>(0);
  const [localPriceSource, setLocalPriceSource] = useState<'websocket' | 'websocket_institutional' | 'http' | 'unknown'>('unknown');

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedPriceRef = useRef<number>(0);
  const updateCounterRef = useRef<number>(0);
  const staleGuardTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const httpFallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountTimeRef = useRef<Date>(new Date());
  const fallbackTriggeredRef = useRef<{ lastTrigger: string; timestamp: number } | null>(null);

  // localStorage utilities for price persistence with 10-minute TTL
  const getStoredPrice = useCallback((sym: string) => {
    try {
      const stored = localStorage.getItem(`lastPrice:${sym}`);
      if (stored) {
        const { price, timestamp } = JSON.parse(stored);
        const storedTime = new Date(timestamp);
        const now = new Date();
        const ageMinutes = (now.getTime() - storedTime.getTime()) / (1000 * 60);
        
        // Only use stored price if less than 10 minutes old
        if (ageMinutes < 10) {
          return { price: Number(price), timestamp: storedTime };
        } else {
          // Remove stale price
          localStorage.removeItem(`lastPrice:${sym}`);
        }
      }
    } catch (e) {
      console.warn('Failed to read stored price:', e);
    }
    return null;
  }, []);

  const storePrice = useCallback((sym: string, price: number, timestamp: Date) => {
    try {
      localStorage.setItem(`lastPrice:${sym}`, JSON.stringify({
        price,
        timestamp: timestamp.toISOString()
      }));
    } catch (e) {
      console.warn('Failed to store price:', e);
    }
  }, []);

  // HTTP fallback for reliable price fetching - prioritize tradermade-streaming with forceFetch
  const fetchLastPriceHTTP = useCallback(async (sym: string): Promise<{ price: number; timestamp: Date } | null> => {
    try {
      console.log(`🔄 [${sym}] HTTP fallback - trying tradermade-streaming with forceFetch...`);
      
      // First try: tradermade-streaming with forceFetch for fresh data
      const tmResponse = await supabase.functions.invoke('tradermade-streaming', {
        body: { 
          symbols: [sym],
          forceFetch: true 
        },
        headers: {
          'x-internal-key': 'imperial-internal-2024' // Use internal key for forceFetch
        }
      });

      if (tmResponse.data?.success && tmResponse.data?.prices?.[sym]) {
        const price = tmResponse.data.prices[sym];
        if (price && price.price && !isNaN(price.price) && price.price > 0) {
          console.log(`⚡ [${sym}] tradermade-streaming forceFetch success:`, price.price, `(served_from: ${price.served_from})`);
          setLocalPriceSource('http');
          return {
            price: price.price,
            timestamp: new Date(price.timestamp || Date.now())
          };
        }
      }

      // Fallback: get-market-data if tradermade-streaming fails
      console.log(`🔄 [${sym}] tradermade-streaming failed, trying get-market-data...`);
      const { data, error } = await supabase.functions.invoke('get-market-data', {
        body: { symbols: [sym] }
      });
      
      if (!error && data?.prices?.[0]?.price > 0) {
        const priceData = data.prices[0];
        console.log(`📡 [${sym}] get-market-data fallback success:`, priceData.price);
        setLocalPriceSource('http');
        return {
          price: priceData.price,
          timestamp: new Date(priceData.timestamp || Date.now())
        };
      }
      
      // Last resort: tradermade-streaming without forceFetch (cache only)
      console.log(`🔄 [${sym}] get-market-data failed, trying tradermade-streaming cache...`);
      const fallbackResponse = await supabase.functions.invoke('tradermade-streaming', {
        body: { symbols: [sym] }
      });
      
      if (!fallbackResponse.error) {
        const priceData = fallbackResponse.data?.prices?.[sym] || fallbackResponse.data?.prices?.[sym.toUpperCase()];
        if (priceData && priceData.price > 0) {
          console.log(`💾 [${sym}] tradermade-streaming cache success:`, priceData.price);
          setLocalPriceSource('http');
          return {
            price: priceData.price,
            timestamp: new Date(priceData.timestamp || Date.now())
          };
        }
      }
    } catch (error) {
      console.error(`❌ [${sym}] HTTP fallback failed:`, error);
    }
    return null;
  }, []);

  // Initialize with stored price on mount
  useEffect(() => {
    const stored = getStoredPrice(normalizedSymbol);
    if (stored && stored.price > 0) {
      console.log(`💾 [${normalizedSymbol}] Restored from storage:`, stored.price);
      setLastNonZeroPrice(stored.price);
      setDebouncedPrice({
        price: stored.price,
        change: 0,
        changePercent: 0
      });
      setLastUpdated(stored.timestamp);
      lastProcessedPriceRef.current = stored.price;
    }
  }, [normalizedSymbol, getStoredPrice]);

  // Subscribe to symbol on mount with HTTP fallback
  useEffect(() => {
    if (!normalizedSymbol) return;

    subscribe([normalizedSymbol]);

    // Check if user has session for fallback timing
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const fallbackDelay = session ? 2000 : 0; // 0ms if no session, 2000ms if authenticated
      
      httpFallbackTimeoutRef.current = setTimeout(async () => {
        if (lastProcessedPriceRef.current === 0) {
          console.log(`⏱️ [${normalizedSymbol}] No price after ${fallbackDelay}ms, trying HTTP fallback...`);
          const fallbackPrice = await fetchLastPriceHTTP(normalizedSymbol);
          if (fallbackPrice && lastProcessedPriceRef.current === 0) {
            setDebouncedPrice({
              price: fallbackPrice.price,
              change: 0,
              changePercent: 0
            });
            setLastUpdated(fallbackPrice.timestamp);
            setLastNonZeroPrice(fallbackPrice.price);
            lastProcessedPriceRef.current = fallbackPrice.price;
            storePrice(normalizedSymbol, fallbackPrice.price, fallbackPrice.timestamp);
          }
        }
      }, fallbackDelay);
    };
    
    checkSession();

    return () => {
      unsubscribe([normalizedSymbol]);
      if (httpFallbackTimeoutRef.current) {
        clearTimeout(httpFallbackTimeoutRef.current);
      }
      if (staleGuardTimeoutRef.current) {
        clearTimeout(staleGuardTimeoutRef.current);
      }
    };
  }, [normalizedSymbol, subscribe, unsubscribe, fetchLastPriceHTTP, storePrice]);

  // One-shot HTTP fallback trigger with state-based suppression
  useEffect(() => {
    const dataAge = lastUpdated ? (Date.now() - lastUpdated.getTime()) / 1000 : Infinity;
    const isStale = dataAge > 15;
    const isDisconnected = connectionStatus === 'disconnected' || connectionStatus === 'error';
    
    // Create trigger state identifier
    const triggerState = `${connectionStatus}-${isStale}`;
    
    // Check if we should trigger fallback
    const shouldTrigger = (isStale || isDisconnected) && 
                         (!fallbackTriggeredRef.current || 
                          fallbackTriggeredRef.current.lastTrigger !== triggerState ||
                          Date.now() - fallbackTriggeredRef.current.timestamp > 30000); // Reset after 30s
    
    if (shouldTrigger) {
      console.log(`🔄 [${normalizedSymbol}] One-shot HTTP fallback triggered:`, {
        connectionStatus,
        dataAge: dataAge.toFixed(1) + 's',
        triggerState
      });
      
      // Mark as triggered to suppress repeats
      fallbackTriggeredRef.current = {
        lastTrigger: triggerState,
        timestamp: Date.now()
      };
      
      // Trigger fallback
      const triggerFallback = async () => {
        const fallbackPrice = await fetchLastPriceHTTP(normalizedSymbol);
        if (fallbackPrice) {
          setDebouncedPrice({
            price: fallbackPrice.price,
            change: 0,
            changePercent: 0
          });
          setLastUpdated(fallbackPrice.timestamp);
          setLastNonZeroPrice(fallbackPrice.price);
          lastProcessedPriceRef.current = fallbackPrice.price;
          storePrice(normalizedSymbol, fallbackPrice.price, fallbackPrice.timestamp);
        }
      };
      
      triggerFallback();
    }
  }, [connectionStatus, lastUpdated, normalizedSymbol, fetchLastPriceHTTP, storePrice]);

  // Symbol-specific price updates with stale-guard and persistence
  useEffect(() => {
    const currentPrice = getPrice(normalizedSymbol);
    updateCounterRef.current++;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 [${normalizedSymbol}] Price effect #${updateCounterRef.current}:`, {
        currentPrice: currentPrice?.price || 0,
        lastProcessed: lastProcessedPriceRef.current,
        hasPrice: !!currentPrice
      });
    }
    
    if (!currentPrice || currentPrice.price === 0) {
      return;
    }

    // Reset fallback trigger on fresh data
    if (currentPrice.price > 0) {
      fallbackTriggeredRef.current = null;
    }

    // Set WebSocket source when receiving real data
    if (currentPrice.is_institutional_tick) {
      setLocalPriceSource('websocket_institutional');
    } else {
      setLocalPriceSource('websocket');
    }

    // CRITICAL: Always commit the first non-zero price immediately
    const isFirstValidPrice = lastProcessedPriceRef.current === 0 && currentPrice.price > 0;
    
    if (isFirstValidPrice) {
      console.log(`✅ [${normalizedSymbol}] First valid price committed immediately:`, currentPrice.price);
      const timestamp = new Date(currentPrice.timestamp);
      setDebouncedPrice({
        price: currentPrice.price,
        change: currentPrice.change,
        changePercent: currentPrice.changePercent
      });
      setLastUpdated(timestamp);
      setLastNonZeroPrice(currentPrice.price);
      lastProcessedPriceRef.current = currentPrice.price;
      storePrice(normalizedSymbol, currentPrice.price, timestamp);
      return;
    }

    // Clear existing timeout to prevent stacking updates
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Business Plan: Ultra-fast debouncing with institutional tick priority
    const isUltraFastTick = currentPrice.is_ultra_fast_tick;
    const isInstitutionalTick = currentPrice.is_institutional_tick;
    const effectiveDebounce = isUltraFastTick ? 30 : isInstitutionalTick ? 50 : Math.min(debounceMs, 100);
    
    debounceTimeoutRef.current = setTimeout(() => {
      const latestPrice = getPrice(normalizedSymbol);
      if (!latestPrice || latestPrice.price === 0) return;

      const timestamp = new Date(latestPrice.timestamp);
      setDebouncedPrice({
        price: latestPrice.price,
        change: latestPrice.change,
        changePercent: latestPrice.changePercent
      });
      setLastUpdated(timestamp);
      setLastNonZeroPrice(latestPrice.price);
      lastProcessedPriceRef.current = latestPrice.price;
      storePrice(normalizedSymbol, latestPrice.price, timestamp);
      
      if (process.env.NODE_ENV === 'development') {
        const tickType = isUltraFastTick ? '⚡ ULTRA-FAST' : isInstitutionalTick ? '💎 INSTITUTIONAL' : '🚀 BUSINESS';
        console.log(`${tickType} [${normalizedSymbol}] Price updated:`, latestPrice.price, `[${effectiveDebounce}ms debounce]`);
      }
    }, effectiveDebounce);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [normalizedSymbol, prices[normalizedSymbol]?.price, debounceMs, getPrice, fetchLastPriceHTTP, storePrice]);

  const refreshPrice = useCallback(async () => {
    // Try context refresh first
    contextRefreshPrice(normalizedSymbol);
    
    // Also trigger HTTP fallback as backup
    setTimeout(async () => {
      const fallbackPrice = await fetchLastPriceHTTP(normalizedSymbol);
      if (fallbackPrice) {
        const timestamp = fallbackPrice.timestamp;
        setDebouncedPrice({
          price: fallbackPrice.price,
          change: 0,
          changePercent: 0
        });
        setLastUpdated(timestamp);
        setLastNonZeroPrice(fallbackPrice.price);
        lastProcessedPriceRef.current = fallbackPrice.price;
        storePrice(normalizedSymbol, fallbackPrice.price, timestamp);
      }
    }, 500);
  }, [contextRefreshPrice, normalizedSymbol, fetchLastPriceHTTP, storePrice]);

  // Get error for this specific symbol or global error
  const symbolError = errors[normalizedSymbol] || errors.global || null;

  // Business Plan: Enhanced connection status with ultra-fast tolerance
  const enhancedConnectionStatus = (() => {
    // Business plan: Consider connection "effectively connected" with tighter freshness requirements
    const dataFreshness = lastUpdated ? (Date.now() - lastUpdated.getTime()) / 1000 : Infinity;
    const hasValidPrice = debouncedPrice.price > 0;
    
    // Business plan: 15s tolerance for ultra-fast infrastructure
    if (dataFreshness < 15 && hasValidPrice) {
      return 'connected';
    }
    
    // Fallback to 30s for regular connections
    if (dataFreshness < 30 && hasValidPrice) {
      return 'connected';
    }
    
    return connectionStatus;
  })();

  return {
    price: debouncedPrice.price || lastNonZeroPrice, // Fallback to last good price
    change: debouncedPrice.change,
    changePercent: debouncedPrice.changePercent,
    isLoading: enhancedConnectionStatus === 'connecting' && debouncedPrice.price === 0,
    error: symbolError,
    lastUpdated: lastUpdated || contextLastUpdated,
    connectionStatus: enhancedConnectionStatus,
    dataSource,
    priceUpdateSource: localPriceSource !== 'unknown' ? localPriceSource : (priceUpdateSources[normalizedSymbol] || 'unknown'),
    refreshPrice
  };
}
