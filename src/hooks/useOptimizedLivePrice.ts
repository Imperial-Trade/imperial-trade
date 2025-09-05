
import { useState, useEffect, useCallback, useRef } from 'react';
import { useHybridWebSocketPrices } from '@/contexts/HybridWebSocketPriceContext';
import { supabase } from '@/integrations/supabase/client';
import { getStandardSymbol } from '@/types/assets';
import { isPricePlausibleForSymbol, isCachedPriceValid, cleanInvalidPriceCache } from '@/utils/priceGuards';

interface OptimizedLivePriceData {
  price: number;
  change: number;
  changePercent: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  dataSource: string;
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
    debounceMs = 50 // Zero-pause: Ultra-fast 50ms debouncing (reduced from 100ms)
  } = options;

  // FIXED: Enhanced symbol normalization with strict validation
  const normalizedSymbol = (() => {
    const standardSymbol = getStandardSymbol(symbol) || symbol.toUpperCase();
    
    console.log(`🔍 [${symbol}] Symbol normalization:`, {
      input: symbol,
      standardSymbol,
      finalMapping: standardSymbol
    });
    
    // Direct mapping - no additional transformations to prevent cross-contamination
    return standardSymbol;
  })();

  const {
    prices,
    connectionStatus,
    dataSource,
    lastUpdated: contextLastUpdated,
    errors,
    subscribe,
    unsubscribe,
    getPrice,
    refreshPrice: contextRefreshPrice
  } = useHybridWebSocketPrices();

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

  // Enhanced localStorage utilities with market-aware TTL and plausibility checks
  const getStoredPrice = useCallback((sym: string) => {
    try {
      const stored = localStorage.getItem(`lastPrice:${sym}`);
      if (stored) {
        const { price, timestamp } = JSON.parse(stored);
        const storedTime = new Date(timestamp);
        
        // Validate using price guards
        if (isCachedPriceValid(sym, { price: Number(price), timestamp: storedTime.getTime() })) {
          console.log(`✅ Valid cache restored for ${sym}: ${price}`);
          return { price: Number(price), timestamp: storedTime };
        } else {
          // Remove invalid cache
          localStorage.removeItem(`lastPrice:${sym}`);
          console.log(`🗑️ Removed invalid cache for ${sym}`);
        }
      }
    } catch (e) {
      console.warn('Failed to read stored price:', e);
    }
    return null;
  }, []);

  const storePrice = useCallback((sym: string, price: number, timestamp: Date) => {
    try {
      // Only store plausible prices
      if (isPricePlausibleForSymbol(price, sym)) {
        localStorage.setItem(`lastPrice:${sym}`, JSON.stringify({
          price,
          timestamp: timestamp.toISOString()
        }));
        console.log(`💾 Stored valid price for ${sym}: ${price}`);
      } else {
        console.warn(`🚫 Refused to store implausible price for ${sym}: ${price}`);
      }
    } catch (e) {
      console.warn('Failed to store price:', e);
    }
  }, []);

  // REMOVED: HTTP fallback logic moved to context for single source of truth

  // Combined initialization effect: cache restore + subscription
  useEffect(() => {
    console.log(`🔍 [${normalizedSymbol}] Initializing with cache validation and subscription`);
    
    // Step 1: Clean invalid cache entries globally first
    cleanInvalidPriceCache();
    
    // Step 2: Try to restore valid cached price for this symbol
    const stored = getStoredPrice(normalizedSymbol);
    if (stored && stored.price > 0) {
      console.log(`💾 [${normalizedSymbol}] Restored valid cache:`, stored.price);
      setLastNonZeroPrice(stored.price);
      setDebouncedPrice({
        price: stored.price,
        change: 0,
        changePercent: 0
      });
      setLastUpdated(stored.timestamp);
      lastProcessedPriceRef.current = stored.price;
    }
    
    // Step 3: Subscribe to live updates
    subscribe([normalizedSymbol]);
    console.log(`📡 [${normalizedSymbol}] Subscription requested`);

    return () => {
      console.log(`🔌 [${normalizedSymbol}] Unsubscribing`);
      unsubscribe([normalizedSymbol]);
    };
  }, [normalizedSymbol, subscribe, unsubscribe, getStoredPrice]);

  // Enhanced price monitoring with symbol validation and plausibility checks
  useEffect(() => {
    const priceData = prices[normalizedSymbol];
    if (priceData && priceData.price > 0) {
      // CRITICAL: Validate that the received price is for the correct symbol
      if (priceData.symbol !== normalizedSymbol) {
        console.error(`🚫 [${normalizedSymbol}] SYMBOL MISMATCH! Requested: ${normalizedSymbol}, Received: ${priceData.symbol} with price: ${priceData.price}`);
        return; // Prevent cross-contamination
      }
      
      // CRITICAL: Validate price plausibility before accepting
      if (!isPricePlausibleForSymbol(priceData.price, normalizedSymbol)) {
        console.error(`🚫 [${normalizedSymbol}] IMPLAUSIBLE PRICE REJECTED: ${priceData.price}`);
        return; // Prevent implausible price updates
      }
      
      console.log(`📡 [${normalizedSymbol}] ✅ Valid price update:`, priceData.price);
      
      setDebouncedPrice({
        price: priceData.price,
        change: priceData.change,
        changePercent: priceData.changePercent
      });
      setLastUpdated(new Date(priceData.timestamp));
      setLastNonZeroPrice(priceData.price);
      lastProcessedPriceRef.current = priceData.price;
      storePrice(normalizedSymbol, priceData.price, new Date(priceData.timestamp));
    }
  }, [prices, normalizedSymbol, storePrice]);

  // REMOVED: Fallback logic moved to context - hook only receives centralized updates

  // REMOVED: Direct price processing removed - hook only receives centralized updates

  // Guard against symbol changes causing stale updates
  useEffect(() => {
    // Reset refs when symbol changes to prevent cross-symbol updates
    lastProcessedPriceRef.current = 0;
    if (fallbackTriggeredRef.current) {
      fallbackTriggeredRef.current = null;
    }
  }, [normalizedSymbol]);

  const refreshPrice = useCallback(async () => {
    // GUARDRAIL: Single refresh through context only
    contextRefreshPrice(normalizedSymbol);
  }, [contextRefreshPrice, normalizedSymbol]);

  // Get error for this specific symbol or global error
  const symbolError = errors[normalizedSymbol] || errors.global || null;

  // GUARDRAIL: Enhanced connection status with 30s sticky-live
  const enhancedConnectionStatus = (() => {
    const dataFreshness = lastUpdated ? (Date.now() - lastUpdated.getTime()) / 1000 : Infinity;
    const hasValidPrice = debouncedPrice.price > 0;
    
    // Zero-pause: Show "connected" for 30s after last update (reduced from 60s for faster feedback)
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
    priceUpdateSource: localPriceSource,
    refreshPrice
  };
}
