import { useCallback, useEffect, useRef, useState } from 'react';
import { useGoldPrice } from '@/contexts/GoldPriceContext';

interface GoldLivePriceData {
  price: number;
  change: number;
  changePercent: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  dataSource: 'gold_price_feed' | 'unavailable';
  refreshPrice: () => void;
}

interface UseGoldLivePriceOptions {
  enableSmartPausing?: boolean;
  debounceMs?: number;
  pauseOnInput?: boolean;
}

export function useGoldLivePrice(
  symbol: string,
  options: UseGoldLivePriceOptions = {}
): GoldLivePriceData {
  const {
    enableSmartPausing = true,
    debounceMs = 300,
    pauseOnInput = false
  } = options;

  const goldContext = useGoldPrice();
  const [debouncedPrice, setDebouncedPrice] = useState<number>(0);
  const [debouncedChange, setDebouncedChange] = useState<number>(0);
  const [debouncedChangePercent, setDebouncedChangePercent] = useState<number>(0);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Only work with gold symbols
  const isGoldSymbol = ['GOLD', 'XAU/USD', 'XAUUSD'].includes(symbol);

  useEffect(() => {
    if (!isGoldSymbol) {
      return;
    }

    // Subscribe to gold prices when component mounts
    goldContext.subscribe();

    return () => {
      // Unsubscribe when component unmounts
      goldContext.unsubscribe();
    };
  }, [symbol, isGoldSymbol, goldContext]);

  // Debounce price updates
  useEffect(() => {
    if (!goldContext.price || !isGoldSymbol) {
      return;
    }

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedPrice(goldContext.price!.price);
      setDebouncedChange(goldContext.price!.change);
      setDebouncedChangePercent(goldContext.price!.changePercent);
    }, debounceMs);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [goldContext.price, debounceMs, isGoldSymbol]);

  const refreshPrice = useCallback(() => {
    if (isGoldSymbol) {
      goldContext.refreshPrice();
    }
  }, [goldContext, isGoldSymbol]);

  // Return default values for non-gold symbols
  if (!isGoldSymbol) {
    return {
      price: 0,
      change: 0,
      changePercent: 0,
      isLoading: false,
      error: 'Not a gold symbol',
      lastUpdated: null,
      connectionStatus: 'disconnected',
      dataSource: 'unavailable',
      refreshPrice: () => {}
    };
  }

  return {
    price: debouncedPrice || goldContext.price?.price || 0,
    change: debouncedChange || goldContext.price?.change || 0,
    changePercent: debouncedChangePercent || goldContext.price?.changePercent || 0,
    isLoading: goldContext.connectionStatus === 'connecting' && !goldContext.price,
    error: goldContext.error,
    lastUpdated: goldContext.lastUpdated,
    connectionStatus: goldContext.connectionStatus,
    dataSource: goldContext.dataSource,
    refreshPrice
  };
}