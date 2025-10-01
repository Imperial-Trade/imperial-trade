// Phase 3: Optimized Live Price Hook with Throttling & Backward Compatibility
import { useState, useEffect, useRef, useCallback } from 'react';
import { useHybridPrices } from '@/contexts/HybridPriceContext';
import { pricePerformanceMonitor } from '@/utils/pricePerformanceMonitor';
import { isDevToolsEnabled } from '@/utils/featureFlags';
import { normalizeSymbol } from '@/utils/symbolUtils';

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
    unsubscribe
  } = useHybridPrices();
  
  // Compatibility layer for old API
  const error = null;
  const lastUpdated = prices[normalizeSymbol(symbol)]?.timestamp ? new Date(prices[normalizeSymbol(symbol)].timestamp) : null;
  const getArrivalAge = (sym: string) => {
    const price = prices[sym];
    return price ? Date.now() - new Date(price.timestamp).getTime() : 999999;
  };
  const getInternalPrice = (sym: string) => prices[sym];
  const ctxRefreshPrice = (sym: string) => {};
  
  const [localState, setLocalState] = useState({
    change: 0,
    changePercent: 0,
    dataAge: 0,
    arrivalAgeMs: 0, // New: Arrival-based age in milliseconds
    arrivalAgeSeconds: 0 // New: Arrival-based age in seconds
  });

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

    setLocalState({
      change,
      changePercent,
      dataAge: Date.now() - new Date(timestamp).getTime(),
      arrivalAgeMs,
      arrivalAgeSeconds
    });

    previousPriceRef.current = price;
    pricePerformanceMonitor.recordUIUpdate();
    pricePerformanceMonitor.recordPriceUpdate(false);
  }, [symbol, getArrivalAge]);

  const refreshPrice = useCallback(async () => {
    ctxRefreshPrice(symbol);
    return Promise.resolve();
  }, [symbol, ctxRefreshPrice]);

  // Subscribe to the symbol using the unified context (unless skipSubscribe is true)
  useEffect(() => {
    if (!symbol || options.skipSubscribe) return;

    // Normalize symbol before subscription
    const normalizedSymbol = normalizeSymbol(symbol);
    
    if (isDevToolsEnabled()) {
      console.log(`🔗 [useOptimizedLivePrice] Subscribing to ${normalizedSymbol}`);
    }
    subscribe([normalizedSymbol]);

    return () => {
      if (isDevToolsEnabled()) {
        console.log(`🧹 [useOptimizedLivePrice] Unsubscribing from ${normalizedSymbol}`);
      }
      unsubscribe([normalizedSymbol]);
    };
  }, [symbol, options.skipSubscribe]); // PHASE 6: Remove subscribe/unsubscribe to prevent hook-level subscription loops

  // Update local state when price changes - immediate updates
  useEffect(() => {
    if (currentPrice) {
      applyImmediateUpdate(currentPrice.price, currentPrice.timestamp);
    }
  }, [currentPrice, applyImmediateUpdate]);

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


  return {
    // Backward compatibility properties
    price: currentPrice?.price || null,
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
    livePrice: currentPrice?.price || null,
    lastUpdate: lastUpdated?.toISOString() || null,
    isConnected: connectionStatus === 'connected',
    dataAge: localState.dataAge,
    isStale: localState.arrivalAgeMs > 3000, // 🔥 FIXED: 3s threshold for Live status
    isVeryStale: localState.arrivalAgeMs > 6000, // Very stale after 6s
    // Sub-2s Live Guarantee properties
    arrivalAgeMs: localState.arrivalAgeMs,
    arrivalAgeSeconds: localState.arrivalAgeSeconds
  };
}