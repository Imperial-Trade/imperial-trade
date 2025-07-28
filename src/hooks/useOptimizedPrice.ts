import { useCallback, useEffect, useRef, useState } from 'react';
import { useUnifiedPrice } from '@/contexts/UnifiedPriceContext';

interface OptimizedPriceData {
  price: number;
  change: number;
  changePercent: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  dataSource: string;
  refreshPrice: () => void;
}

interface UseOptimizedPriceOptions {
  enableSmartPausing?: boolean;
  debounceMs?: number;
  pauseOnInput?: boolean;
}

export function useOptimizedPrice(
  symbol: string,
  options: UseOptimizedPriceOptions = {}
): OptimizedPriceData {
  const {
    enableSmartPausing = true,
    debounceMs = 300,
    pauseOnInput = false
  } = options;

  const unifiedPrice = useUnifiedPrice();
  const [debouncedPrice, setDebouncedPrice] = useState<number>(0);
  const [debouncedChange, setDebouncedChange] = useState<number>(0);
  const [debouncedChangePercent, setDebouncedChangePercent] = useState<number>(0);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Get current price data
  const priceData = unifiedPrice.getPrice(symbol);

  useEffect(() => {
    if (!symbol) return;

    // Subscribe to the symbol
    if (!isSubscribed) {
      console.log(`📡 Subscribing to optimized price for ${symbol}`);
      unifiedPrice.subscribe([symbol]);
      setIsSubscribed(true);
    }

    return () => {
      // Unsubscribe when component unmounts
      if (isSubscribed) {
        console.log(`📤 Unsubscribing from optimized price for ${symbol}`);
        unifiedPrice.unsubscribe([symbol]);
        setIsSubscribed(false);
      }
    };
  }, [symbol, unifiedPrice, isSubscribed]);

  // Debounce price updates for smoother UI
  useEffect(() => {
    if (!priceData) return;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedPrice(priceData.price);
      setDebouncedChange(priceData.change);
      setDebouncedChangePercent(priceData.changePercent);
    }, debounceMs);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [priceData, debounceMs]);

  const refreshPrice = useCallback(() => {
    if (symbol) {
      unifiedPrice.refreshPrices([symbol]);
    }
  }, [unifiedPrice, symbol]);

  return {
    price: debouncedPrice || priceData?.price || 0,
    change: debouncedChange || priceData?.change || 0,
    changePercent: debouncedChangePercent || priceData?.changePercent || 0,
    isLoading: unifiedPrice.connectionStatus === 'connecting' && !priceData,
    error: unifiedPrice.error,
    lastUpdated: unifiedPrice.lastUpdated,
    connectionStatus: unifiedPrice.connectionStatus,
    dataSource: priceData?.dataSource || 'unavailable',
    refreshPrice
  };
}