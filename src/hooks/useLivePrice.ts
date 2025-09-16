// src/hooks/useLivePrice.ts - Pure consumer hook (Single Source of Truth Architecture)

import { useOptimizedLivePrice } from './useOptimizedLivePrice';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { useState, useEffect, useRef } from 'react';

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
  const rawConnectionQuality = getConnectionQuality(symbol);
  
  // 🚀 ANTI-FLICKER: Debounced connection quality with minimum state duration
  const [stableConnectionQuality, setStableConnectionQuality] = useState(rawConnectionQuality);
  const qualityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastQualityChangeRef = useRef<number>(Date.now());
  
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastChange = now - lastQualityChangeRef.current;
    const MINIMUM_STATE_DURATION = 500; // 500ms minimum before quality can change
    
    // Clear existing timeout
    if (qualityTimeoutRef.current) {
      clearTimeout(qualityTimeoutRef.current);
    }
    
    // If quality is different and enough time has passed, update immediately
    if (rawConnectionQuality !== stableConnectionQuality && timeSinceLastChange > MINIMUM_STATE_DURATION) {
      setStableConnectionQuality(rawConnectionQuality);
      lastQualityChangeRef.current = now;
    } 
    // Otherwise, wait for minimum duration before allowing change
    else if (rawConnectionQuality !== stableConnectionQuality) {
      const remainingTime = MINIMUM_STATE_DURATION - timeSinceLastChange;
      qualityTimeoutRef.current = setTimeout(() => {
        setStableConnectionQuality(rawConnectionQuality);
        lastQualityChangeRef.current = Date.now();
      }, Math.max(0, remainingTime));
    }
    
    return () => {
      if (qualityTimeoutRef.current) {
        clearTimeout(qualityTimeoutRef.current);
      }
    };
  }, [rawConnectionQuality, stableConnectionQuality]);
  
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
    quality: stableConnectionQuality, // Use debounced quality
    isLoading: optimizedData.isLoading,
    isStale: stableConnectionQuality === 'stale',
    refreshPrice: optimizedData.refreshPrice,
    
    // "Hydrate and Highlight" state indicators
    connectionQuality: stableConnectionQuality, // Use debounced quality
    lastUpdated: optimizedData.lastUpdated,
  };
}