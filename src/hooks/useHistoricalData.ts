import { useState, useCallback } from 'react';
import { HistoricalDataPoint, HistoricalDataRequest } from '@/types/marketData';

interface UseHistoricalDataReturn {
  data: HistoricalDataPoint[];
  isLoading: boolean;
  error: string | null;
  fetchHistoricalData: (request: HistoricalDataRequest) => Promise<void>;
}

export const useHistoricalData = (): UseHistoricalDataReturn => {
  const [data] = useState<HistoricalDataPoint[]>([]);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>('Historical data feature is coming soon');

  const fetchHistoricalData = useCallback(async (request: HistoricalDataRequest) => {
    console.log('Historical data feature is coming soon', { request });
    // No edge function calls - feature disabled
    return Promise.resolve();
  }, []);

  return {
    data,
    isLoading,
    error,
    fetchHistoricalData
  };
};