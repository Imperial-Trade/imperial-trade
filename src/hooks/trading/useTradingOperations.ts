
import { useCallback } from 'react';
import { CreateTradeAlertDto, UpdateTradeAlertDto, TradeAlertResponseDto } from '@/domain/dtos/trading/CreateTradeAlertDto';

interface UseTradingOperationsOptions {
  realtimeCreateAlert: (dto: CreateTradeAlertDto) => Promise<TradeAlertResponseDto | null>;
  realtimeUpdateAlert: (id: string, dto: UpdateTradeAlertDto) => Promise<TradeAlertResponseDto | null>;
  realtimeDeleteAlert: (id: string) => Promise<boolean>;
  realtimeRefreshAlerts: () => Promise<void>;
  usingFallback: boolean;
  fetchAlertsFallback: (force?: boolean) => Promise<void>;
}

interface UseTradingOperationsReturn {
  createAlert: (dto: CreateTradeAlertDto) => Promise<TradeAlertResponseDto | null>;
  updateAlert: (id: string, dto: UpdateTradeAlertDto) => Promise<TradeAlertResponseDto | null>;
  deleteAlert: (id: string) => Promise<boolean>;
  refreshAlerts: () => Promise<void>;
}

export const useTradingOperations = ({
  realtimeCreateAlert,
  realtimeUpdateAlert,
  realtimeDeleteAlert,
  realtimeRefreshAlerts,
  usingFallback,
  fetchAlertsFallback
}: UseTradingOperationsOptions): UseTradingOperationsReturn => {
  
  const createAlert = useCallback(async (dto: CreateTradeAlertDto): Promise<TradeAlertResponseDto | null> => {
    const result = await realtimeCreateAlert(dto);
    
    // If using fallback, refresh alerts after create
    if (usingFallback && result) {
      await fetchAlertsFallback(true);
    }
    
    return result;
  }, [realtimeCreateAlert, usingFallback, fetchAlertsFallback]);

  const updateAlert = useCallback(async (id: string, dto: UpdateTradeAlertDto): Promise<TradeAlertResponseDto | null> => {
    const result = await realtimeUpdateAlert(id, dto);
    
    // If using fallback, refresh alerts after update
    if (usingFallback && result) {
      await fetchAlertsFallback(true);
    }
    
    return result;
  }, [realtimeUpdateAlert, usingFallback, fetchAlertsFallback]);

  const deleteAlert = useCallback(async (id: string): Promise<boolean> => {
    const result = await realtimeDeleteAlert(id);
    
    // If using fallback, refresh alerts after delete
    if (usingFallback && result) {
      await fetchAlertsFallback(true);
    }
    
    return result;
  }, [realtimeDeleteAlert, usingFallback, fetchAlertsFallback]);

  const refreshAlerts = useCallback(async () => {
    if (usingFallback) {
      await fetchAlertsFallback(true);
    } else {
      await realtimeRefreshAlerts();
    }
  }, [usingFallback, fetchAlertsFallback, realtimeRefreshAlerts]);

  return {
    createAlert,
    updateAlert,
    deleteAlert,
    refreshAlerts
  };
};
