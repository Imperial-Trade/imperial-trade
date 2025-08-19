
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
    debounceMs = 250 // Increased to 250ms to reduce noise
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

    // Only trigger updates for significant price changes (> 0.02%)
    const priceChanged = currentPrice.price !== lastProcessedPriceRef.current;
    if (lastProcessedPriceRef.current > 0 && currentPrice.price > 0) {
      const changePercent = Math.abs((currentPrice.price - lastProcessedPriceRef.current) / lastProcessedPriceRef.current) * 100;
      if (changePercent < 0.02) { // Increased threshold to reduce noise
        return;
      }
    }

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
      const changePercent = Math.abs((latestPrice.price - lastProcessedPriceRef.current) / lastProcessedPriceRef.current) * 100;
      if (changePercent >= 0.02) {
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
    // Consider connection "effectively connected" if we have recent data
    const dataFreshness = lastUpdated ? (Date.now() - lastUpdated.getTime()) / 1000 : Infinity;
    const hasValidPrice = debouncedPrice.price > 0;
    
    if (dataFreshness < 45 && hasValidPrice) { // Increased tolerance
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
