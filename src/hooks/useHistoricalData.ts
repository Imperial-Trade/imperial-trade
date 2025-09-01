import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { HistoricalDataPoint, HistoricalDataRequest } from '@/types/marketData';

interface UseHistoricalDataReturn {
  data: HistoricalDataPoint[];
  isLoading: boolean;
  error: string | null;
  fetchHistoricalData: (request: HistoricalDataRequest) => Promise<void>;
}

export const useHistoricalData = (): UseHistoricalDataReturn => {
  const [data, setData] = useState<HistoricalDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistoricalData = useCallback(async (request: HistoricalDataRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Use get-historical-data edge function for historical data
      const { data, error } = await supabase.functions.invoke('get-historical-data', {
        body: request
      });

      if (error) throw error;

      setData(data?.historical || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch historical data';
      setError(errorMessage);
      console.error('Historical data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    data,
    isLoading,
    error,
    fetchHistoricalData
  };
};