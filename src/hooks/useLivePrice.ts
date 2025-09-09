// src/hooks/useLivePrice.ts - Refactored to use unified context

import { useEffect } from 'react';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';

export function useLivePrice(symbol: string) {
  const { getPrice, subscribe, unsubscribe } = useOptimizedWebSocketPrices();

  useEffect(() => {
    if (!symbol) return;

    // Subscribe to this symbol using the unified context
    subscribe([symbol]);

    // Cleanup: unsubscribe when component unmounts or symbol changes
    return () => {
      unsubscribe([symbol]);
    };
  }, [symbol, subscribe, unsubscribe]);

  // Return the current price for this symbol
  const priceData = getPrice(symbol);
  return priceData?.price || null;
}