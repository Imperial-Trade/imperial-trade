
import { useState, useEffect, useCallback } from 'react';
import { marketDataService, MarketDataPoint, MarketDataRequest } from '@/services/MarketDataService';

interface UseMarketDataReturn {
  data: MarketDataPoint[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

export const useMarketData = (symbols: string[], enabled: boolean = true): UseMarketDataReturn => {
  const [data, setData] = useState<MarketDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || symbols.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const request: MarketDataRequest = {
        symbols,
        includeVolume: true
      };

      const result = await marketDataService.getMarketData(request);
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch market data');
      console.error('useMarketData error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [symbols, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
    lastUpdated
  };
};
