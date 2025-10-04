import { useEffect, useState, useCallback } from 'react';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';

interface PriceStalenessStatus {
  isStale: boolean;
  ageInSeconds: number | null;
  lastUpdate: Date | null;
  isHealthy: boolean;
  stalePrices: string[];
  // 🚀 FRONTEND THROTTLING: Enhanced status with dual-layer awareness
  uiThrottled: boolean;
  dataFreshness: 'live' | 'throttled' | 'stale';
}

export function usePriceStalenessMonitor(symbol?: string, maxAgeSeconds: number = 8) {
  const { 
    getConnectionHealth, 
    lastUpdated, 
    prices, 
    getArrivalAge,
    getInternalPrice,
    internalPrices,
    uiThrottleMs 
  } = useOptimizedWebSocketPrices();
  
  const [stalenessStatus, setStalenessStatus] = useState<PriceStalenessStatus>({
    isStale: false,
    ageInSeconds: null,
    lastUpdate: null,
    isHealthy: true,
    stalePrices: [],
    uiThrottled: false,
    dataFreshness: 'stale'
  });

  const checkStaleness = useCallback(() => {
    const health = getConnectionHealth();
    
    if (symbol) {
      // Sub-2s Live Guarantee: Use arrival age for ultra-responsive staleness detection
      const arrivalAge = getArrivalAge(symbol);
      const ageInSeconds = arrivalAge !== Infinity ? Math.floor(arrivalAge / 1000) : null;
      const isStale = ageInSeconds ? ageInSeconds > maxAgeSeconds : true;
      
      // 🚀 FRONTEND THROTTLING: Compare UI vs internal prices to detect throttling
      const uiPrice = prices[symbol];
      const internalPrice = getInternalPrice(symbol);
      const uiThrottled = !!(uiPrice && internalPrice && 
        Math.abs(uiPrice.price - internalPrice.price) > 0.0001);
      
      // Determine data freshness considering both layers
      let dataFreshness: 'live' | 'throttled' | 'stale' = 'stale';
      if (internalPrice && ageInSeconds !== null) {
        if (ageInSeconds <= maxAgeSeconds) {
          dataFreshness = uiThrottled ? 'throttled' : 'live';
        } else if (ageInSeconds <= maxAgeSeconds * 2) {
          dataFreshness = 'throttled';
        }
      }
      
      setStalenessStatus({
        isStale,
        ageInSeconds,
        lastUpdate: lastUpdated,
        isHealthy: health.isHealthy,
        stalePrices: [], // Simplified for hybrid system
        uiThrottled,
        dataFreshness
      });
    } else {
      setStalenessStatus({
        isStale: false,
        ageInSeconds: null,
        lastUpdate: health.lastUpdate,
        isHealthy: health.isHealthy,
        stalePrices: [], // Simplified for hybrid system
        uiThrottled: false,
        dataFreshness: 'live'
      });
    }
  }, [symbol, maxAgeSeconds, lastUpdated, prices, internalPrices, uiThrottleMs, getConnectionHealth, getArrivalAge, getInternalPrice]);

  useEffect(() => {
    // Check immediately
    checkStaleness();

    // Check every second for active monitoring
    const interval = setInterval(checkStaleness, 1000);

    return () => clearInterval(interval);
  }, [checkStaleness]);

  return stalenessStatus;
}