
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
  connectionStatus?: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastUpdated?: Date | null;
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

  // Use operations hook
  const operations = useTradingOperations({
    realtimeCreateAlert: realtimeHook.createAlert,
    realtimeUpdateAlert: realtimeHook.updateAlert,
    realtimeDeleteAlert: realtimeHook.deleteAlert,
    realtimeRefreshAlerts: realtimeHook.refreshAlerts,
    usingFallback,
    fetchAlertsFallback
  });

  // Return appropriate data based on connection status
  const alerts = usingFallback ? fallbackAlerts : realtimeHook.alerts;
  const isLoading = usingFallback ? fallbackLoading : realtimeHook.isLoading;
  const error = usingFallback ? fallbackError : realtimeHook.error;

  return {
    alerts,
    isLoading,
    error,
    ...operations,
    connectionStatus: realtimeHook.connectionStatus,
    lastUpdated: realtimeHook.lastUpdated
  };
};
