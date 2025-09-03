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
      // Use market_prices table for market data
      const { data, error } = await supabase
        .from('market_prices')
        .select('symbol, bid, ask, mid, timestamp')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Convert market_prices response to MarketDataPoint format
      const marketData: MarketDataPoint[] = [];
      if (data && data.length > 0) {
        data.forEach((priceData: any) => {
          if (priceData && priceData.symbol) {
            marketData.push({
              symbol: priceData.symbol,
              price: priceData.mid || ((priceData.bid + priceData.ask) / 2),
              change: 0, // Not available from market_prices
              changePercent: 0, // Not available from market_prices  
              timestamp: priceData.timestamp || new Date().toISOString(),
              dataSource: 'supabase',
              dataQuality: 'real_time'
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