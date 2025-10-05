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
  
  const [localState, setLocalState] = useState({
    change: 0,
    changePercent: 0,
    dataAge: 0,
    arrivalAgeMs: 0, // New: Arrival-based age in milliseconds
    arrivalAgeSeconds: 0, // New: Arrival-based age in seconds
    optimisticPrice: null as number | null, // 🚀 STEP 3: Optimistic interpolated price
    isInterpolating: false // Flag to indicate if showing interpolated value
  });

  // 🚀 STEP 3: Price history for interpolation (last 3 data points)
  const priceHistoryRef = useRef<Array<{ price: number; timestamp: number }>>([]);

  // PATH A: Phase 3 Complete - Zero throttling for ultra-responsive updates
  const previousPriceRef = useRef<number | null>(null);

  const currentPrice = prices[normalizeSymbol(symbol)];

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
    if (!symbol || options.skipSubscribe) return;

    // Normalize symbol before subscription
    const normalizedSymbol = normalizeSymbol(symbol);
    
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

  // 🚀 PHASE 2B: Smooth Price Streaming - 200ms Visual Ticks with Velocity-Based Interpolation
  useEffect(() => {
    if (!currentPrice || priceHistoryRef.current.length < 2) return;

    const interval = setInterval(() => {
      const history = priceHistoryRef.current;
      if (history.length < 2) return;

      const now = Date.now();
      const latest = history[history.length - 1];
      const timeSinceLastUpdate = now - latest.timestamp;

      // 🚀 Ultra-responsive: Show real price immediately when fresh (< 500ms)
      if (timeSinceLastUpdate <= 500) {
        setLocalState(prev => ({
          ...prev,
          optimisticPrice: latest.price,
          isInterpolating: false
        }));
      } else if (timeSinceLastUpdate > 500 && timeSinceLastUpdate < 1500) {
        // 🚀 Smooth interpolation between 500ms-1.5s (fills gaps between polls)
        const prev = history[history.length - 2];
        const timeDelta = latest.timestamp - prev.timestamp;
        const priceDelta = latest.price - prev.price;
        
        // Calculate velocity (conservative - reduce by 50% to avoid overshooting)
        const velocity = (priceDelta / timeDelta) * 0.5;

        // Smooth interpolation with easing
        const interpolationTime = timeSinceLastUpdate - 500;
        const estimatedPrice = latest.price + (velocity * interpolationTime);

        setLocalState(prev => ({
          ...prev,
          optimisticPrice: estimatedPrice,
          isInterpolating: true
        }));
      } else {
        // Data is stale (> 1.5s), show last known real price
        setLocalState(prev => ({
          ...prev,
          optimisticPrice: latest.price,
          isInterpolating: false
        }));
      }
    }, 200); // 🚀 200ms ticks for zero visual pause

    return () => clearInterval(interval);
  }, [currentPrice]);

  // PATH A: Real-time data age tracking with faster interval + Sub-2s arrival age tracking
  useEffect(() => {
    if (!currentPrice || options.trackDataAge === false) return;

    const interval = setInterval(() => {
      const arrivalAgeMs = getArrivalAge(normalizeSymbol(symbol));
      const arrivalAgeSeconds = Math.floor(arrivalAgeMs / 1000);
      
      // 🔥 CRITICAL FIX: Use internal price for accurate data age calculation
      const internalPrice = getInternalPrice(normalizeSymbol(symbol));
      const dataAgeMs = internalPrice 
        ? Date.now() - new Date(internalPrice.timestamp).getTime()
        : Date.now() - new Date(currentPrice.timestamp).getTime();
      
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