// Phase 3: Optimized Live Price Hook with Throttling & Backward Compatibility
import { useState, useEffect, useRef, useCallback } from 'react';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { pricePerformanceMonitor } from '@/utils/pricePerformanceMonitor';
import { isDevToolsEnabled } from '@/utils/featureFlags';

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
}

export function useOptimizedLivePrice(symbol: string, options: LivePriceOptions = {}): LivePriceReturn {
  const { prices, connectionStatus, subscribe, unsubscribe, error, lastUpdated, refreshPrice: ctxRefreshPrice } = useOptimizedWebSocketPrices();
  
  const [localState, setLocalState] = useState({
    change: 0,
    changePercent: 0,
    dataAge: 0
  });

  // Phase 3: Throttling configuration
  const throttledUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdateRef = useRef<{ price: number; timestamp: string } | null>(null);
  const previousPriceRef = useRef<number | null>(null);
  const THROTTLE_DELAY_MS = options.debounceMs || 250;

  const currentPrice = prices[symbol];

  const applyThrottledUpdate = useCallback((price: number, timestamp: string) => {
    pendingUpdateRef.current = { price, timestamp };
    pricePerformanceMonitor.recordPriceUpdate(false);
    
    if (!throttledUpdateRef.current) {
      // Immediate update for first price
      const prevPrice = previousPriceRef.current;
      const change = prevPrice ? price - prevPrice : 0;
      const changePercent = prevPrice && prevPrice > 0 ? (change / prevPrice) * 100 : 0;

      setLocalState({
        change,
        changePercent,
        dataAge: Date.now() - new Date(timestamp).getTime()
      });

      previousPriceRef.current = price;
      pricePerformanceMonitor.recordUIUpdate();

      // Set up throttling for subsequent updates
      throttledUpdateRef.current = setTimeout(() => {
        const pending = pendingUpdateRef.current;
        if (pending) {
          const prevPrice = previousPriceRef.current;
          const change = prevPrice ? pending.price - prevPrice : 0;
          const changePercent = prevPrice && prevPrice > 0 ? (change / prevPrice) * 100 : 0;

          setLocalState({
            change,
            changePercent,
            dataAge: Date.now() - new Date(pending.timestamp).getTime()
          });

          previousPriceRef.current = pending.price;
          pricePerformanceMonitor.recordUIUpdate();
        }
        throttledUpdateRef.current = null;
        pendingUpdateRef.current = null;
      }, THROTTLE_DELAY_MS);
    }
  }, [THROTTLE_DELAY_MS]);

  const refreshPrice = useCallback(async () => {
    ctxRefreshPrice(symbol);
    return Promise.resolve();
  }, [symbol, ctxRefreshPrice]);

  // Subscribe to the symbol using the unified context
  useEffect(() => {
    if (!symbol) return;

    if (isDevToolsEnabled()) {
      console.log(`🔗 [useOptimizedLivePrice] Subscribing to ${symbol}`);
    }
    subscribe([symbol]);

    return () => {
      if (isDevToolsEnabled()) {
        console.log(`🧹 [useOptimizedLivePrice] Unsubscribing from ${symbol}`);
      }
      unsubscribe([symbol]);
    };
  }, [symbol, subscribe, unsubscribe]);

  // Update local state when price changes
  useEffect(() => {
    if (currentPrice) {
      applyThrottledUpdate(currentPrice.price, currentPrice.timestamp);
    }
  }, [currentPrice, applyThrottledUpdate]);

  // Data age tracking interval - guarded by trackDataAge option
  useEffect(() => {
    if (!currentPrice || options.trackDataAge === false) return;

    const interval = setInterval(() => {
      setLocalState(prev => ({
        ...prev,
        dataAge: Date.now() - new Date(currentPrice.timestamp).getTime()
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, [currentPrice, options.trackDataAge]);

  // Cleanup throttled update on unmount
  useEffect(() => {
    return () => {
      if (throttledUpdateRef.current) {
        clearTimeout(throttledUpdateRef.current);
        throttledUpdateRef.current = null;
      }
    };
  }, []);

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
    isStale: localState.dataAge > 60000,
    isVeryStale: localState.dataAge > 300000
  };
}