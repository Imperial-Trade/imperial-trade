// src/hooks/useLivePrice.ts - Enhanced with "Hydrate and Subscribe" pattern

import { useEffect } from 'react';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';

export function useLivePrice(symbol: string) {
  const { getPrice, subscribe, unsubscribe } = useOptimizedWebSocketPrices();

  useEffect(() => {
    if (!symbol) return;

    // 🚀 PHASE 2: "Hydrate and Subscribe" pattern
    // Subscribe immediately triggers database hydration + Realtime subscription
    subscribe([symbol]);

    // Cleanup: unsubscribe when component unmounts or symbol changes
    return () => {
      unsubscribe([symbol]);
    };
  }, [symbol, subscribe, unsubscribe]);

  // Return backward compatible price number
  const priceData = getPrice(symbol);
  return priceData?.price || null;
}

// Enhanced hook with full quality indicators and graceful failure states
export function useEnhancedLivePrice(symbol: string) {
  const { 
    getPrice, 
    subscribe, 
    unsubscribe, 
    getDataAge, 
    getConnectionQuality,
    refreshPrice 
  } = useOptimizedWebSocketPrices();

  useEffect(() => {
    if (!symbol) return;

    // 🚀 PHASE 2: "Hydrate and Subscribe" pattern
    subscribe([symbol]);

    return () => {
      unsubscribe([symbol]);
    };
  }, [symbol, subscribe, unsubscribe]);

  // Return enhanced price data with quality indicators
  const priceData = getPrice(symbol);
  const dataAge = getDataAge(symbol);
  const quality = getConnectionQuality();
  
  return {
    // Backward compatible
    price: priceData?.price || null,
    
    // Enhanced data  
    priceData,
    dataAge,
    quality,
    isLoading: !priceData,
    isStale: dataAge > 60, // Older than 60 seconds
    refreshPrice: () => refreshPrice(symbol),
    
    // Graceful failure state indicators
    connectionQuality: quality,
    lastUpdated: priceData?.timestamp ? new Date(priceData.timestamp) : null,
  };
}