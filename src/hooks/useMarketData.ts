import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MarketDataPoint, MarketDataRequest } from '@/types/marketData';

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
      // Use tradermade-streaming for market data
      const { data, error } = await supabase.functions.invoke('tradermade-streaming', {
        body: { symbols }
      });

      if (error) throw error;

      // Convert tradermade response to MarketDataPoint format
      const marketData: MarketDataPoint[] = [];
      if (data?.success && data?.prices) {
        Object.entries(data.prices).forEach(([symbol, priceData]: [string, any]) => {
          if (priceData && priceData.price) {
            marketData.push({
              symbol,
              price: priceData.price,
              change: priceData.change || 0,
              changePercent: priceData.changePercent || 0,
              timestamp: priceData.timestamp || new Date().toISOString(),
              dataSource: 'tradermade',
              dataQuality: priceData.stale ? 'delayed' : 'real_time'
            });
          }
        });
      }

      setData(marketData);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch market data';
      setError(errorMessage);
      console.error('Market data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, symbols]);

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