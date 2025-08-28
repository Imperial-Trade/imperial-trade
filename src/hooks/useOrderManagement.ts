import { useState, useCallback } from 'react';
import { TradingApiService } from '@/api/services/TradingApiService';
import { UpdateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';

interface UseOrderManagementResult {
  updateOrderStatus: (id: string, status: UpdateTradeAlertDto) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export const useOrderManagement = (): UseOrderManagementResult => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateOrderStatus = useCallback(async (id: string, updates: UpdateTradeAlertDto): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const result = await TradingApiService.prototype.updateTradeAlert(id, updates);
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
    updateOrderStatus,
    loading,
    error,
  };
};
