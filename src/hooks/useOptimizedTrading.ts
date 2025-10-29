
import { useState } from 'react';
import { useOptimizedTradingRealtime } from './useOptimizedTradingRealtime';
import { useTradingFallback } from './trading/useTradingFallback';
import { useTradingPolling } from './trading/useTradingPolling';
import { useTradingOperations } from './trading/useTradingOperations';
import { TradeAlertWithProfile } from '@/api/services/TradingApiService';
import { CreateTradeAlertDto, UpdateTradeAlertDto, TradeAlertResponseDto } from '@/domain/dtos/trading/CreateTradeAlertDto';

interface UseOptimizedTradingReturn {
  alerts: TradeAlertWithProfile[];
  isLoading: boolean;
  error: string | null;
  createAlert: (dto: CreateTradeAlertDto) => Promise<TradeAlertResponseDto | null>;
  updateAlert: (id: string, dto: UpdateTradeAlertDto) => Promise<TradeAlertResponseDto | null>;
  deleteAlert: (id: string) => Promise<boolean>;
  refreshAlerts: () => Promise<void>;
  connectionStatus?: 'connecting' | 'connected' | 'disconnected' | 'error' | 'polling-fallback';
  lastUpdated?: Date | null;
  nextRetryAt?: number | null;
}

export const useOptimizedTrading = (userId: string, showAllSignals: boolean = false): UseOptimizedTradingReturn => {
  // Try real-time first
  const realtimeHook = useOptimizedTradingRealtime(userId, showAllSignals);
  
  // Fallback state for HTTP polling
  const [usingFallback, setUsingFallback] = useState(false);
  
  const shouldFetchAlerts = showAllSignals || Boolean(userId && userId.trim() !== '');

  // Check if we should use fallback based on connection status
  const shouldUseFallback = realtimeHook.connectionStatus === 'error' || 
                           realtimeHook.connectionStatus === 'disconnected';

  // Use fallback hook
  const {
    fallbackAlerts,
    fallbackLoading,
    fallbackError,
    fetchAlertsFallback
  } = useTradingFallback({
    userId,
    showAllSignals,
    shouldUseFallback
  });

  // Use polling hook
  useTradingPolling({
    shouldUseFallback,
    shouldFetchAlerts,
    fetchAlertsFallback,
    setUsingFallback
  });

  // Trading operations with proper return types
  const createAlert = async (dto: CreateTradeAlertDto): Promise<TradeAlertResponseDto | null> => {
    try {
      console.log('🔵 useOptimizedTrading: Creating alert', {
        asset: dto.assetName,
        type: dto.tradeType
      });
      const result = await realtimeHook.createAlert(dto);
      console.log('🔵 useOptimizedTrading: Got result:', result ? '✅ SUCCESS' : '❌ NULL');
      if (result) {
        console.log('🔵 Signal created successfully:', result.id);
      }
      return result;
    } catch (error) {
      console.error('🔴 useOptimizedTrading: Exception caught:', error);
      console.error('🔴 Error stack:', error instanceof Error ? error.stack : 'No stack');
      return null;
    }
  };

  const updateAlert = async (id: string, dto: UpdateTradeAlertDto): Promise<TradeAlertResponseDto | null> => {
    try {
      const result = await realtimeHook.updateAlert(id, dto);
      return result;
    } catch (error) {
      console.error('Error in updateAlert:', error);
      return null;
    }
  };

  const deleteAlert = async (id: string): Promise<boolean> => {
    try {
      return await realtimeHook.deleteAlert(id);
    } catch (error) {
      console.error('Error in deleteAlert:', error);
      return false;
    }
  };

  const refreshAlerts = async (): Promise<void> => {
    if (usingFallback) {
      await fetchAlertsFallback(true);
    } else {
      await realtimeHook.refreshAlerts();
    }
  };

  // Return appropriate data based on connection status
  const alerts = usingFallback ? fallbackAlerts : realtimeHook.alerts;
  const isLoading = usingFallback ? fallbackLoading : realtimeHook.isLoading;
  const error = usingFallback ? fallbackError : realtimeHook.error;

  return {
    alerts,
    isLoading,
    error,
    createAlert,
    updateAlert,
    deleteAlert,
    refreshAlerts,
    connectionStatus: realtimeHook.connectionStatus,
    lastUpdated: realtimeHook.lastUpdated,
    nextRetryAt: realtimeHook.nextRetryAt
  };
};
