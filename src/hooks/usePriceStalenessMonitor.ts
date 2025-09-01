import { useEffect, useState } from 'react';
import { useWebSocketPrices } from '@/contexts/WebSocketPriceContext';

interface PriceStalenessStatus {
  isStale: boolean;
  ageInSeconds: number | null;
  lastUpdate: Date | null;
  isHealthy: boolean;
  stalePrices: string[];
}

export function usePriceStalenessMonitor(symbol?: string, maxAgeSeconds: number = 30) {
  const { getPriceAge, isPriceStale, getConnectionHealth, lastUpdated } = useWebSocketPrices();
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
        const age = getPriceAge(symbol);
        const isStale = isPriceStale(symbol, maxAgeSeconds);
        
        setStalenessStatus({
          isStale,
          ageInSeconds: age ? Math.floor(age / 1000) : null,
          lastUpdate: lastUpdated,
          isHealthy: health.isHealthy,
          stalePrices: health.stalePrices
        });
      } else {
        setStalenessStatus({
          isStale: false,
          ageInSeconds: null,
          lastUpdate: health.lastUpdate,
          isHealthy: health.isHealthy,
          stalePrices: health.stalePrices
        });
      }
    };

    // Check immediately
    checkStaleness();

    // Check every second for active monitoring
    const interval = setInterval(checkStaleness, 1000);

    return () => clearInterval(interval);
  }, [symbol, maxAgeSeconds, getPriceAge, isPriceStale, getConnectionHealth, lastUpdated]);

  return stalenessStatus;
}