
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

  // localStorage utilities for price persistence
  const getStoredPrice = useCallback((sym: string) => {
    try {
      const stored = localStorage.getItem(`lastPrice:${sym}`);
      if (stored) {
        const { price, timestamp } = JSON.parse(stored);
        return { price: Number(price), timestamp: new Date(timestamp) };
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

  // HTTP fallback for reliable price fetching
  const fetchLastPriceHTTP = useCallback(async (sym: string): Promise<{ price: number; timestamp: Date } | null> => {
    try {
      console.log(`🔄 [${sym}] HTTP fallback - fetching last price...`);
      const { data, error } = await supabase.functions.invoke('tradermade-streaming', {
        body: { symbols: [sym] }
      });
      
      if (error) {
        console.error(`❌ [${sym}] HTTP fallback error:`, error);
        return null;
      }

      // Fix: Edge function returns { success, prices: { [symbol]: priceData } }
      const priceData = data?.prices?.[sym] || data?.prices?.[sym.toUpperCase()];
      if (priceData && priceData.price > 0) {
        console.log(`✅ [${sym}] HTTP fallback success:`, priceData.price);
        setLocalPriceSource('http');
        return {
          price: priceData.price,
          timestamp: new Date(priceData.timestamp || Date.now())
        };
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

    // HTTP fallback if no price after 1.5s
    httpFallbackTimeoutRef.current = setTimeout(async () => {
      if (lastProcessedPriceRef.current === 0) {
        console.log(`⏱️ [${normalizedSymbol}] No price after 1.5s, trying HTTP fallback...`);
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
    }, 1500);

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
      // Start stale-guard if no updates for 2+ seconds
      if (staleGuardTimeoutRef.current) {
        clearTimeout(staleGuardTimeoutRef.current);
      }
      staleGuardTimeoutRef.current = setTimeout(async () => {
        console.log(`🚨 [${normalizedSymbol}] Stale data detected, triggering HTTP fallback...`);
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
      }, 2000);
      return;
    }

    // Clear stale guard on fresh data
    if (staleGuardTimeoutRef.current) {
      clearTimeout(staleGuardTimeoutRef.current);
      staleGuardTimeoutRef.current = null;
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
    isLoading: enhancedConnectionStatus === 'connecting',
    error: symbolError,
    lastUpdated: lastUpdated || contextLastUpdated,
    connectionStatus: enhancedConnectionStatus,
    dataSource,
    priceUpdateSource: localPriceSource !== 'unknown' ? localPriceSource : (priceUpdateSources[normalizedSymbol] || 'unknown'),
    refreshPrice
  };
}
