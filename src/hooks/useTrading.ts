
import { useState, useCallback } from 'react';
import { tradingApiService } from '@/api/services/TradingApiService';
import { CreateTradeAlertDto, UpdateTradeAlertDto, TradeAlertResponseDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { useApi } from './useApi';

interface UseTradingReturn {
  alerts: TradeAlertResponseDto[];
  isLoading: boolean;
  error: string | null;
  createAlert: (dto: CreateTradeAlertDto) => Promise<TradeAlertResponseDto | null>;
  updateAlert: (id: string, dto: UpdateTradeAlertDto) => Promise<TradeAlertResponseDto | null>;
  deleteAlert: (id: string) => Promise<boolean>;
  refreshAlerts: () => Promise<void>;
}

export const useTrading = (userId: string): UseTradingReturn => {
  const [alerts, setAlerts] = useState<TradeAlertResponseDto[]>([]);

  // Only execute API call if userId is valid and not empty
  const shouldFetchAlerts = Boolean(userId && userId.trim() !== '');

  const {
    data: alertsData,
    isLoading,
    error,
    execute: fetchAlerts
  } = useApi(
    () => tradingApiService.getAllAlerts(userId),
    {
      immediate: shouldFetchAlerts, // Only fetch immediately if we have a valid userId
      onSuccess: (response) => {
        if (response.success && response.data) {
          setAlerts(response.data);
        }
      },
      onError: (error) => {
        console.error('Failed to fetch alerts:', error);
      }
    }
  );

  const createAlert = useCallback(async (dto: CreateTradeAlertDto): Promise<TradeAlertResponseDto | null> => {
    if (!shouldFetchAlerts) {
      console.warn('Cannot create alert: invalid userId');
      return null;
    }

    try {
      const result = await tradingApiService.createAlert(dto, userId);
      if (result.success && result.data) {
        setAlerts(prev => [result.data!, ...prev]);
        return result.data;
      } else {
        console.error('Failed to create alert:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Error creating alert:', error);
      return null;
    }
  }, [userId, shouldFetchAlerts]);

  const updateAlert = useCallback(async (id: string, dto: UpdateTradeAlertDto): Promise<TradeAlertResponseDto | null> => {
    if (!shouldFetchAlerts) {
      console.warn('Cannot update alert: invalid userId');
      return null;
    }

    try {
      const result = await tradingApiService.updateAlert(id, dto, userId);
      if (result.success && result.data) {
        setAlerts(prev => prev.map(alert => 
          alert.id === id ? result.data! : alert
        ));
        return result.data;
      } else {
        console.error('Failed to update alert:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Error updating alert:', error);
      return null;
    }
  }, [userId, shouldFetchAlerts]);

  const deleteAlert = useCallback(async (id: string): Promise<boolean> => {
    if (!shouldFetchAlerts) {
      console.warn('Cannot delete alert: invalid userId');
      return false;
    }

    try {
      const result = await tradingApiService.deleteAlert(id, userId);
      if (result.success) {
        setAlerts(prev => prev.filter(alert => alert.id !== id));
        return true;
      } else {
        console.error('Failed to delete alert:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error deleting alert:', error);
      return false;
    }
  }, [userId, shouldFetchAlerts]);

  const refreshAlerts = useCallback(async () => {
    if (shouldFetchAlerts) {
      await fetchAlerts();
    }
  }, [fetchAlerts, shouldFetchAlerts]);

  return {
    alerts: alertsData?.success ? alertsData.data || [] : alerts,
    isLoading: shouldFetchAlerts ? isLoading : false,
    error: shouldFetchAlerts ? error : null,
    createAlert,
    updateAlert,
    deleteAlert,
    refreshAlerts
  };
};
