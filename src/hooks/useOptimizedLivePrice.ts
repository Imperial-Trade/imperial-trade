// Phase 3: Optimized Live Price Hook with Throttling & Backward Compatibility
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { pricePerformanceMonitor } from '@/utils/pricePerformanceMonitor';
import { isDevToolsEnabled } from '@/utils/featureFlags';
import { normalizeSymbol } from '@/utils/symbolUtils';

// 🚀 STEP 5: Runtime hook validation (development mode only)
if (process.env.NODE_ENV === 'development') {
  // Validate we're inside a React component by checking React internals
  if (typeof React !== 'undefined' && !React.version) {
    console.error('❌ React validation failed - hooks may be called incorrectly');
  }
}

interface PriceData {
  symbol: string;
  price: number;
  ts: string;
}

interface LivePriceOptions {
  debounceMs?: number;
  enableSmartPausing?: boolean;
  pauseOnInput?: boolean;
  trackDataAge?: boolean; // New option to guard data age tracking interval
  skipSubscribe?: boolean; // New option to prevent subscription (for consumer hooks)
}

interface LivePriceReturn {
  // Backward compatibility
  price: number | null;
  change: number;
  changePercent: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  connectionStatus: string;
  dataSource: string;
  priceUpdateSource: string;
  refreshPrice: () => Promise<void>;
  // New optimized properties
  livePrice: number | null;
  lastUpdate: string | null;
  isConnected: boolean;
  dataAge: number;
  isStale: boolean;
  isVeryStale: boolean;
  // Sub-2s Live Guarantee properties
  arrivalAgeMs: number;
  arrivalAgeSeconds: number;
}

export function useOptimizedLivePrice(symbol: string, options: LivePriceOptions = {}): LivePriceReturn {
  const { 
    prices, 
    connectionStatus, 
    subscribe, 
    unsubscribe, 
    error, 
    lastUpdated, 
    refreshPrice: ctxRefreshPrice, 
    getArrivalAge,
    getInternalPrice // 🔥 CRITICAL: Access internal prices for accurate age calculation
  } = useOptimizedWebSocketPrices();
  
  const PRICE_CACHE_KEY = `last_known_price_${symbol}`;
  const PRICE_CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
  
  const [localState, setLocalState] = useState({
    change: 0,
    changePercent: 0,
    dataAge: 0,
    arrivalAgeMs: 0, // New: Arrival-based age in milliseconds
    arrivalAgeSeconds: 0, // New: Arrival-based age in seconds
    optimisticPrice: null as number | null, // 🚀 STEP 3: Optimistic interpolated price
    isInterpolating: false // Flag to indicate if showing interpolated value
  });

  // ✅ PHASE 1: Load cached price on mount if no current price available
  useEffect(() => {
    const currentPrice = prices[normalizeSymbol(symbol)]?.price;
    if (!currentPrice || currentPrice <= 0) {
      try {
        const cached = localStorage.getItem(PRICE_CACHE_KEY);
        if (cached) {
          const { price: cachedPrice, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          if (age < PRICE_CACHE_EXPIRY_MS && cachedPrice > 0) {
            setLocalState(prev => ({ ...prev, optimisticPrice: cachedPrice }));
          }
        }
      } catch (e) {
        console.warn('Failed to load cached price:', e);
      }
    }
  }, [symbol]);

  // ✅ PHASE 1: Save valid prices to cache
  const currentPrice = prices[normalizeSymbol(symbol)];
  useEffect(() => {
    if (currentPrice?.price && currentPrice.price > 0) {
      try {
        localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify({
          price: currentPrice.price,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.warn('Failed to cache price:', e);
      }
    }
  }, [currentPrice?.price, symbol]);

  // 🚀 STEP 3: Price history for interpolation (last 3 data points)
  const priceHistoryRef = useRef<Array<{ price: number; timestamp: number }>>([]);

  // PATH A: Phase 3 Complete - Zero throttling for ultra-responsive updates
  const previousPriceRef = useRef<number | null>(null);

  const applyImmediateUpdate = useCallback((price: number, timestamp: string) => {
    // PATH A: Phase 3 Complete - Immediate state updates with zero throttling + Sub-2s guarantee
    const prevPrice = previousPriceRef.current;
    const change = prevPrice ? price - prevPrice : 0;
    const changePercent = prevPrice && prevPrice > 0 ? (change / prevPrice) * 100 : 0;
    
    // Calculate arrival-based age for ultra-responsive freshness
    const arrivalAgeMs = getArrivalAge(normalizeSymbol(symbol));
    const arrivalAgeSeconds = Math.floor(arrivalAgeMs / 1000);

    // 🚀 STEP 3: Update price history for interpolation
    const now = Date.now();
    priceHistoryRef.current.push({ price, timestamp: now });
    // Keep only last 3 data points
    if (priceHistoryRef.current.length > 3) {
      priceHistoryRef.current.shift();
    }

    setLocalState({
      change,
      changePercent,
      dataAge: Date.now() - new Date(timestamp).getTime(),
      arrivalAgeMs,
      arrivalAgeSeconds,
      optimisticPrice: price, // Reset to real price when new data arrives
      isInterpolating: false
    });

    previousPriceRef.current = price;
    pricePerformanceMonitor.recordUIUpdate();
    pricePerformanceMonitor.recordPriceUpdate(false);
  }, [symbol, getArrivalAge]);

  const refreshPrice = useCallback(async () => {
    ctxRefreshPrice(symbol);
    return Promise.resolve();
  }, [symbol, ctxRefreshPrice]);

  // 🚀 ANTI-CHURN: Prevent subscription churn with first-mount-only refresh
  const isFirstMountRef = useRef(true);
  const currentSymbolRef = useRef(symbol);
  
  // 🚀 STEP 3: Stabilize subscribe/unsubscribe with refs to prevent stale closures
  const subscribeRef = useRef(subscribe);
  const unsubscribeRef = useRef(unsubscribe);
  
  useEffect(() => {
    subscribeRef.current = subscribe;
    unsubscribeRef.current = unsubscribe;
  }, [subscribe, unsubscribe]);

  // Subscribe to the symbol using the unified context (unless skipSubscribe is true)
  useEffect(() => {
    if (!symbol || options.skipSubscribe) {
      if (isDevToolsEnabled()) {
        console.log(`⏭️ [useOptimizedLivePrice] Skipping subscription for ${symbol} (skipSubscribe=${options.skipSubscribe})`);
      }
      return;
    }

    // Normalize symbol before subscription
    const normalizedSymbol = normalizeSymbol(symbol);
    
    if (isDevToolsEnabled()) {
      console.log(`🔍 [useOptimizedLivePrice] Symbol normalization: ${symbol} -> ${normalizedSymbol}`);
    }
    
    // 🔥 ANTI-CHURN FIX: Only refresh on first mount OR symbol change
    const symbolChanged = currentSymbolRef.current !== normalizedSymbol;
    if (isFirstMountRef.current || symbolChanged) {
      if (isDevToolsEnabled()) {
        console.log(`🔗 [useOptimizedLivePrice] ${isFirstMountRef.current ? 'First mount' : 'Symbol changed'}: Subscribing to ${normalizedSymbol} with immediate refresh`);
      }
      ctxRefreshPrice(normalizedSymbol);
      isFirstMountRef.current = false;
      currentSymbolRef.current = normalizedSymbol;
    } else {
      if (isDevToolsEnabled()) {
        console.log(`♻️ [useOptimizedLivePrice] Re-subscribing to ${normalizedSymbol} (no refresh - preventing churn)`);
      }
    }
    
    subscribeRef.current([normalizedSymbol]);
    
    if (isDevToolsEnabled()) {
      console.log(`✅ [useOptimizedLivePrice] Subscription initiated for ${normalizedSymbol}`);
    }

    return () => {
      if (isDevToolsEnabled()) {
        console.log(`🧹 [useOptimizedLivePrice] Unsubscribing from ${normalizedSymbol}`);
      }
      unsubscribeRef.current([normalizedSymbol]);
    };
  }, [symbol, options.skipSubscribe]); // ✅ Removed ctxRefreshPrice from deps to prevent churn

  // Update local state when price changes - immediate updates
  useEffect(() => {
    if (currentPrice) {
      applyImmediateUpdate(currentPrice.price, currentPrice.timestamp);
    }
  }, [currentPrice, applyImmediateUpdate]);

  // PHASE 4: FIX #5 - Remove Price Interpolation Delay (ELIMINATED 200ms interval)
  // Direct price updates from context with ZERO delay
  useEffect(() => {
    if (!currentPrice) return;
    
    // Update price history for change calculations
    const now = Date.now();
    priceHistoryRef.current.push({ price: currentPrice.price, timestamp: now });
    if (priceHistoryRef.current.length > 3) {
      priceHistoryRef.current.shift();
    }
    
    // Direct update - no interpolation, no delay
    setLocalState(prev => ({
      ...prev,
      optimisticPrice: currentPrice.price,
      isInterpolating: false
    }));
  }, [currentPrice]);

  // PATH A: Real-time data age tracking with faster interval + Sub-2s arrival age tracking
  useEffect(() => {
    if (!currentPrice || options.trackDataAge === false) return;

    const interval = setInterval(() => {
      const arrivalAgeMs = getArrivalAge(normalizeSymbol(symbol));
      const arrivalAgeSeconds = Math.floor(arrivalAgeMs / 1000);
      
      // PHASE 4: FIX #11 - Use arrival age for accurate data age (not display timestamp)
      const dataAgeMs = arrivalAgeMs; // Already accurate from getArrivalAge
      
      setLocalState(prev => ({
        ...prev,
        dataAge: dataAgeMs,
        arrivalAgeMs,
        arrivalAgeSeconds
      }));
    }, 250); // Sub-2s guarantee: Even faster updates at 250ms for ultra-responsive feel

    return () => clearInterval(interval);
  }, [currentPrice, options.trackDataAge, symbol, getArrivalAge, getInternalPrice]);


  // 🚀 STEP 3: Use optimistic price for display if available and interpolating
  const displayPrice = localState.isInterpolating && localState.optimisticPrice 
    ? localState.optimisticPrice 
    : currentPrice?.price || null;

  return {
    // Backward compatibility properties
    price: displayPrice,
    change: localState.change,
    changePercent: localState.changePercent,
    isLoading: connectionStatus === 'connecting',
    error: error,
    lastUpdated: lastUpdated,
    connectionStatus: connectionStatus,
    dataSource: 'websocket',
    priceUpdateSource: 'websocket_institutional',
    refreshPrice,
    // New optimized properties
    livePrice: displayPrice,
    lastUpdate: lastUpdated?.toISOString() || null,
    isConnected: connectionStatus === 'connected',
    dataAge: localState.dataAge,
    isStale: localState.arrivalAgeMs > 4000, // 🚀 CRITICAL FIX: 4s threshold (2 missed polls) for faster stale detection
    isVeryStale: localState.arrivalAgeMs > 10000, // Very stale after 10s
    // Sub-2s Live Guarantee properties
    arrivalAgeMs: localState.arrivalAgeMs,
    arrivalAgeSeconds: localState.arrivalAgeSeconds
  };
}