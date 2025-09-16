// src/hooks/useLivePrice.ts - Pure consumer hook (Single Source of Truth Architecture)

import { useOptimizedLivePrice } from './useOptimizedLivePrice';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';

export function useLivePrice(symbol: string) {
  // ✅ SINGLE SOURCE OF TRUTH: Uses useOptimizedLivePrice internally
  // This hook is now a pure consumer that never creates its own subscriptions
  const { price } = useOptimizedLivePrice(symbol);
  
  // Return backward compatible price number
  return price;
}

// Enhanced hook with quality indicators - Pure consumer (Single Source of Truth Architecture)
export function useEnhancedLivePrice(symbol: string) {
  // ✅ SINGLE SOURCE OF TRUTH: Uses useOptimizedLivePrice internally with skipSubscribe
  // This hook is now a pure consumer that never creates its own subscriptions
  const optimizedData = useOptimizedLivePrice(symbol, { skipSubscribe: true });
  
  // Get connection quality from the context directly (symbol-specific with hysteresis)
  const { getConnectionQuality } = useOptimizedWebSocketPrices();
  const connectionQuality = getConnectionQuality(symbol);
  
  return {
    // Backward compatible
    price: optimizedData.price,
    
    // Enhanced data  
    priceData: optimizedData.price ? {
      symbol,
      price: optimizedData.price,
      change: optimizedData.change,
      timestamp: optimizedData.lastUpdate || new Date().toISOString()
    } : null,
    dataAge: Math.floor(optimizedData.dataAge / 1000), // Convert to seconds
    quality: connectionQuality,
    isLoading: optimizedData.isLoading,
    isStale: connectionQuality === 'stale',
    refreshPrice: optimizedData.refreshPrice,
    
    // "Hydrate and Highlight" state indicators
    connectionQuality,
    lastUpdated: optimizedData.lastUpdated,
  };
}