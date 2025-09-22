import { useEffect, useState } from 'react';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';

interface PriceStalenessStatus {
  isStale: boolean;
  ageInSeconds: number | null;
  lastUpdate: Date | null;
  isHealthy: boolean;
  stalePrices: string[];
}

export function usePriceStalenessMonitor(symbol?: string, maxAgeSeconds: number = 2) {
  const { getConnectionHealth, lastUpdated, prices, getArrivalAge } = useOptimizedWebSocketPrices();
  const [stalenessStatus, setStalenessStatus] = useState<PriceStalenessStatus>({
    isStale: false,
    ageInSeconds: null,
    lastUpdate: null,
    isHealthy: true,
    stalePrices: []
  });

  useEffect(() => {
    const checkStaleness = () => {
      const health = getConnectionHealth();
      
      if (symbol) {
        // Sub-2s Live Guarantee: Use arrival age for ultra-responsive staleness detection
        const arrivalAge = getArrivalAge(symbol);
        const ageInSeconds = arrivalAge !== Infinity ? Math.floor(arrivalAge / 1000) : null;
        const isStale = ageInSeconds ? ageInSeconds > maxAgeSeconds : true;
        
        setStalenessStatus({
          isStale,
          ageInSeconds,
          lastUpdate: lastUpdated,
          isHealthy: health.isHealthy,
          stalePrices: [] // Simplified for hybrid system
        });
      } else {
        setStalenessStatus({
          isStale: false,
          ageInSeconds: null,
          lastUpdate: health.lastUpdate,
          isHealthy: health.isHealthy,
          stalePrices: [] // Simplified for hybrid system
        });
      }
    };

    // Check immediately
    checkStaleness();

    // Check every second for active monitoring
    const interval = setInterval(checkStaleness, 1000);

    return () => clearInterval(interval);
  }, [symbol, maxAgeSeconds, getConnectionHealth, lastUpdated, prices, getArrivalAge]);

  return stalenessStatus;
}