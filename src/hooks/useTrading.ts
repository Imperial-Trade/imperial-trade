
import { useState, useCallback } from 'react';
import { tradingApiService } from '@/api/services/TradingApiService';
import { CreateTradeAlertDto, UpdateTradeAlertDto, TradeAlertResponseDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { useApi } from './useApi';
import { apiClient } from '@/api/client/ApiClient';

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

  const {
    data: alertsData,
    isLoading,
    error,
    execute: fetchAlerts
  } = useApi(
    () => tradingApiService.getAllAlerts(userId),
    {
      immediate: true,
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
  }, [userId]);

  const updateAlert = useCallback(async (id: string, dto: UpdateTradeAlertDto): Promise<TradeAlertResponseDto | null> => {
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
  }, [userId]);

  const deleteAlert = useCallback(async (id: string): Promise<boolean> => {
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
  }, [userId]);

  const refreshAlerts = useCallback(async () => {
    await fetchAlerts();
  }, [fetchAlerts]);

  return {
    alerts: alertsData?.success ? alertsData.data || [] : alerts,
    isLoading,
    error,
    createAlert,
    updateAlert,
    deleteAlert,
    refreshAlerts
  };
};
