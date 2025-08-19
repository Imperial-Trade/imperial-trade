
import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocketPrices } from '@/contexts/WebSocketPriceContext';

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
    debounceMs = 200 // Optimized 200ms for smooth updates without blinking
  } = options;

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

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedPriceRef = useRef<number>(0);

  // Subscribe to symbol on mount
  useEffect(() => {
    if (!symbol) return;

    subscribe([symbol]);

    return () => {
      unsubscribe([symbol]);
    };
  }, [symbol, subscribe, unsubscribe]);

  // Optimized price updates with smart debouncing and change detection
  useEffect(() => {
    const currentPrice = getPrice(symbol);
    
    if (!currentPrice || currentPrice.price === 0) return;

    // Smart update logic: only process if price changed significantly
    const priceChanged = currentPrice.price !== lastProcessedPriceRef.current;
    const isSignificantChange = Math.abs(currentPrice.price - debouncedPrice.price) > (currentPrice.price * 0.001); // 0.1% change
    
    if (!priceChanged && !isSignificantChange) return;

    // Clear existing timeout to prevent stacking updates
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Use consistent debounce for smoother experience
    debounceTimeoutRef.current = setTimeout(() => {
      // Double-check price hasn't become stale
      const latestPrice = getPrice(symbol);
      if (!latestPrice || latestPrice.price === 0) return;

      setDebouncedPrice({
        price: latestPrice.price,
        change: latestPrice.change,
        changePercent: latestPrice.changePercent
      });
      setLastUpdated(new Date(latestPrice.timestamp));
      
      // Track significant updates for performance monitoring
      if (isSignificantChange) {
        setLastSignificantUpdate(new Date());
      }
      
      lastProcessedPriceRef.current = latestPrice.price;
    }, debounceMs);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [prices, symbol, debounceMs, getPrice]);

  const refreshPrice = useCallback(() => {
    contextRefreshPrice(symbol);
  }, [contextRefreshPrice, symbol]);

  // Get error for this specific symbol or global error
  const symbolError = errors[symbol] || errors.global || null;

  // Enhanced connection status logic
  const enhancedConnectionStatus = (() => {
    // If we have recent price data, we're effectively connected
    const hasRecentData = lastUpdated && (Date.now() - lastUpdated.getTime()) < 10000; // 10 seconds
    const hasValidPrice = debouncedPrice.price > 0;
    
    if (hasRecentData && hasValidPrice && connectionStatus !== 'error') {
      return 'connected';
    }
    return connectionStatus;
  })();

  return {
    price: debouncedPrice.price,
    change: debouncedPrice.change,
    changePercent: debouncedPrice.changePercent,
    isLoading: enhancedConnectionStatus === 'connecting',
    error: symbolError,
    lastUpdated: lastUpdated || contextLastUpdated,
    connectionStatus: enhancedConnectionStatus,
    dataSource,
    priceUpdateSource: priceUpdateSources[symbol] || 'unknown',
    refreshPrice
  };
}
