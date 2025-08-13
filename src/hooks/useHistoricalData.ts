import { useState, useCallback } from "react";
import {
  marketDataService,
  HistoricalDataPoint,
  HistoricalDataRequest,
} from "@/services/MarketDataService";

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

  const fetchHistoricalData = useCallback(
    async (request: HistoricalDataRequest) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await marketDataService.getHistoricalData(request);
        setData(result);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch historical data"
        );
        logger.error("useHistoricalData error:", err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    data,
    isLoading,
    error,
    fetchHistoricalData,
  };
};
