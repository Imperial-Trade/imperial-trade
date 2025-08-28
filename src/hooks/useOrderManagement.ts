
import { useState, useCallback } from 'react';
import { tradingApiService } from '@/api/services/TradingApiService';
import { UpdateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';

interface UseOrderManagementResult {
  updateAlert: (id: string, status: UpdateTradeAlertDto) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export const useOrderManagement = (): UseOrderManagementResult => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateAlert = useCallback(async (id: string, updates: UpdateTradeAlertDto): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const result = await tradingApiService.updateTradeAlert(id, updates);
      if (!result) {
        setError('Failed to update order status');
        return false;
      }
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to update order status');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    updateAlert,
    loading,
    error,
  };
};
