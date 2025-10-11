
import { useCallback, useState, useEffect, useMemo } from 'react';
import { useSignalRealtime as useSignalRealtimeContext } from '@/contexts/SignalRealtimeContext';
import { tradingApiService, TradeAlertWithProfile } from '@/api/services/TradingApiService';
import { UpdateTradeAlertDto, TradeAlertResponseDto } from '@/domain/dtos/trading/CreateTradeAlertDto';

interface UseSignalRealtimeReturn {
  alerts: TradeAlertWithProfile[];
  isLoading: boolean;
  error: string | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' | 'polling-fallback';
  nextRetryAt: number | null;
  updateAlert: (id: string, dto: UpdateTradeAlertDto) => Promise<TradeAlertResponseDto | null>;
  refreshAlerts: () => Promise<void>;
  lastUpdated: Date | null;
  getSignalById: (signalId: string) => TradeAlertWithProfile | undefined;
}

export const useSignalRealtime = (userId: string, showAllSignals: boolean = false): UseSignalRealtimeReturn => {
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  
  // Get real-time context with safe fallback
  const context = useSignalRealtimeContext();
  const {
    signals: allSignals,
    connectionStatus,
    lastUpdated,
    error: contextError,
    nextRetryAt,
    subscribe,
    unsubscribe,
    refreshSignals: contextRefreshSignals,
    getSignalById
  } = context;

  // Combine loading and error states
  const isLoading = localLoading;
  const error = localError || contextError;

  // Filter signals - RLS policies handle educator/admin filtering
  const filteredAlerts = useMemo(() => {
    return allSignals;
  }, [allSignals]);

  // Stable subscribe/unsubscribe callbacks
  const stableSubscribe = useCallback(() => {
    subscribe();
  }, [subscribe]);

  const stableUnsubscribe = useCallback(() => {
    unsubscribe();
  }, [unsubscribe]);

  // Subscribe to realtime updates
  useEffect(() => {
    stableSubscribe();
    return () => {
      stableUnsubscribe();
    };
  }, [stableSubscribe, stableUnsubscribe]);

  // Sync realtime error
  useEffect(() => {
    setLocalError(contextError);
  }, [contextError]);

  const updateAlert = useCallback(async (id: string, dto: UpdateTradeAlertDto): Promise<TradeAlertResponseDto | null> => {
    if (!userId || !userId.trim()) {
      setLocalError('User not authenticated');
      return null;
    }

    try {
      setLocalLoading(true);
      const result = await tradingApiService.updateAlert(id, dto, userId);
      
      if (result.success && result.data) {
        return result.data;
      } else {
        setLocalError(result.error || 'Failed to update alert');
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLocalError(errorMessage);
      return null;
    } finally {
      setLocalLoading(false);
    }
  }, [userId]);

  const handleRefreshAlerts = useCallback(async () => {
    try {
      setLocalLoading(true);
      setLocalError(null);
      await contextRefreshSignals();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh alerts';
      setLocalError(errorMessage);
    } finally {
      setLocalLoading(false);
    }
  }, [contextRefreshSignals]);

  return {
    alerts: filteredAlerts,
    isLoading,
    error,
    connectionStatus,
    nextRetryAt,
    updateAlert,
    refreshAlerts: handleRefreshAlerts,
    lastUpdated,
    getSignalById
  };
};
