
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
  priceUpdateSource: 'websocket' | 'http' | 'unknown';
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
    debounceMs = 500
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

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to symbol on mount
  useEffect(() => {
    if (!symbol) return;

    subscribe([symbol]);

    return () => {
      unsubscribe([symbol]);
    };
  }, [symbol, subscribe, unsubscribe]);

  // Optimized price updates with smart debouncing
  useEffect(() => {
    const currentPrice = getPrice(symbol);
    
    if (!currentPrice) return;

    // Smart debouncing: shorter delay for price changes, longer for same price
    const isSignificantChange = Math.abs(currentPrice.price - debouncedPrice.price) > (currentPrice.price * 0.001); // 0.1% change
    const dynamicDelay = isSignificantChange ? Math.min(debounceMs, 200) : debounceMs;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedPrice({
        price: currentPrice.price,
        change: currentPrice.change,
        changePercent: currentPrice.changePercent
      });
      setLastUpdated(new Date(currentPrice.timestamp));
    }, dynamicDelay);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [prices, symbol, debounceMs, getPrice, debouncedPrice.price]);

  const refreshPrice = useCallback(() => {
    contextRefreshPrice(symbol);
  }, [contextRefreshPrice, symbol]);

  // Get error for this specific symbol or global error
  const symbolError = errors[symbol] || errors.global || null;

  return {
    price: debouncedPrice.price,
    change: debouncedPrice.change,
    changePercent: debouncedPrice.changePercent,
    isLoading: connectionStatus === 'connecting',
    error: symbolError,
    lastUpdated: lastUpdated || contextLastUpdated,
    connectionStatus,
    dataSource,
    priceUpdateSource: priceUpdateSources[symbol] || 'unknown',
    refreshPrice
  };
}
