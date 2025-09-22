import { useEffect, useState } from 'react';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';

interface PriceStalenessStatus {
  isStale: boolean;
  ageInSeconds: number | null;
  lastUpdate: Date | null;
  isHealthy: boolean;
  stalePrices: string[];
}

export function usePriceStalenessMonitor(symbol?: string, maxAgeSeconds: number = 15) {
  const { getConnectionHealth, lastUpdated, prices } = useOptimizedWebSocketPrices();
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
        const priceData = prices[symbol];
        const now = Date.now();
        const priceAge = priceData?.timestamp ? now - new Date(priceData.timestamp).getTime() : null;
        const ageInSeconds = priceAge ? Math.floor(priceAge / 1000) : null;
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
  }, [symbol, maxAgeSeconds, getConnectionHealth, lastUpdated, prices]);

  return stalenessStatus;
}