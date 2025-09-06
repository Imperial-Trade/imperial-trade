import { useEffect, useState } from 'react';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';

interface PriceStalenessStatus {
  isStale: boolean;
  ageInSeconds: number | null;
  lastUpdate: Date | null;
  isHealthy: boolean;
  stalePrices: string[];
  freshness: 'fresh' | 'live' | 'delayed' | 'stale';
  displayStatus: 'Live' | 'Delayed' | 'Stale' | 'Offline';
}

export function usePriceStalenessMonitor(symbol?: string, maxAgeSeconds: number = 30) {
  const { prices, connectionStatus } = useOptimizedWebSocketPrices();
  const [stalenessStatus, setStalenessStatus] = useState<PriceStalenessStatus>({
    isStale: false,
    ageInSeconds: null,
    lastUpdate: null,
    isHealthy: true,
    stalePrices: [],
    freshness: 'fresh',
    displayStatus: 'Live'
  });

  useEffect(() => {
    const checkStaleness = () => {
      // Use connection status directly for immediate feedback
      const isConnected = connectionStatus === 'connected';
      
      if (symbol) {
        const priceData = prices[symbol];
        const now = Date.now();
        const priceAge = priceData?.timestamp ? now - new Date(priceData.timestamp).getTime() : null;
        const ageInSeconds = priceAge ? Math.floor(priceAge / 1000) : null;
        
        // ULTRA-FAST: Graduated staleness detection for ultra-responsive UI
        let freshness: 'fresh' | 'live' | 'delayed' | 'stale';
        let displayStatus: 'Live' | 'Delayed' | 'Stale' | 'Offline';
        let isStale: boolean;
        
        if (!isConnected) {
          freshness = 'stale';
          displayStatus = 'Offline';
          isStale = true;
        } else if (!ageInSeconds || ageInSeconds <= 5) {
          freshness = 'fresh';
          displayStatus = 'Live';
          isStale = false;
        } else if (ageInSeconds <= 15) {
          freshness = 'live';
          displayStatus = 'Live';
          isStale = false;
        } else if (ageInSeconds <= maxAgeSeconds) {
          freshness = 'delayed';
          displayStatus = 'Delayed';
          isStale = false;
        } else {
          freshness = 'stale';
          displayStatus = 'Stale';
          isStale = true;
        }
        
        setStalenessStatus({
          isStale,
          ageInSeconds,
          lastUpdate: priceData ? new Date(priceData.timestamp) : null,
          isHealthy: isConnected && !isStale,
          stalePrices: isStale && symbol ? [symbol] : [],
          freshness,
          displayStatus
        });
      } else {
        setStalenessStatus({
          isStale: !isConnected,
          ageInSeconds: null,
          lastUpdate: null,
          isHealthy: isConnected,
          stalePrices: [],
          freshness: isConnected ? 'fresh' : 'stale',
          displayStatus: isConnected ? 'Live' : 'Offline'
        });
      }
    };

    // Check immediately
    checkStaleness();

    // Check every second for active monitoring
    const interval = setInterval(checkStaleness, 1000);

    return () => clearInterval(interval);
  }, [symbol, maxAgeSeconds, connectionStatus, prices]);

  return stalenessStatus;
}