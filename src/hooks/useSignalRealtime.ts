
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSignalRealtime as useSignalRealtimeContext } from '@/contexts/SignalRealtimeContext';
import { TradeAlertWithProfile, tradingApiService } from '@/api/services/TradingApiService';
import { UpdateTradeAlertDto, TradeAlertResponseDto } from '@/domain/dtos/trading/CreateTradeAlertDto';

interface UseSignalRealtimeReturn {
  alerts: TradeAlertWithProfile[];
  isLoading: boolean;
  error: string | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  updateAlert: (id: string, dto: UpdateTradeAlertDto) => Promise<TradeAlertResponseDto | null>;
  refreshAlerts: () => Promise<void>;
  lastUpdated: Date | null;
}

export const useSignalRealtime = (
  userId: string = '', 
  showAllSignals: boolean = false
): UseSignalRealtimeReturn => {
  const {
    signals,
    connectionStatus,
    lastUpdated,
    error: realtimeError,
    subscribe,
    unsubscribe,
    refreshSignals
  } = useSignalRealtimeContext();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter signals based on showAllSignals flag
  const filteredAlerts = useMemo(() => {
    if (showAllSignals) {
      return signals;
    }
    
    if (!userId || userId.trim() === '') {
      return [];
    }
    
    return signals.filter(signal => signal.creator?.id === userId);
  }, [signals, showAllSignals, userId]);

  // Subscribe to realtime updates on mount
  useEffect(() => {
    if (showAllSignals || (userId && userId.trim() !== '')) {
      subscribe();
      
      return () => {
        unsubscribe();
      };
    }
  }, [showAllSignals, userId, subscribe, unsubscribe]);

  // Sync realtime error with local error state
  useEffect(() => {
    setError(realtimeError);
  }, [realtimeError]);

  const updateAlert = useCallback(async (id: string, dto: UpdateTradeAlertDto): Promise<TradeAlertResponseDto | null> => {
    if (!userId || !userId.trim()) {
      console.warn('Cannot update alert: invalid userId');
      return null;
    }

    try {
      setIsLoading(true);
      const result = await tradingApiService.updateAlert(id, dto, userId);
      
      if (result.success && result.data) {
        // The realtime context will handle the update automatically
        return result.data;
      } else {
        console.error('Failed to update alert:', result.error);
        setError(result.error || 'Failed to update alert');
        return null;
      }
    } catch (error) {
      console.error('Error updating alert:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const handleRefreshAlerts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await refreshSignals();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh alerts';
      setError(errorMessage);
      console.error('Failed to refresh alerts:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [refreshSignals]);

  return {
    alerts: filteredAlerts,
    isLoading,
    error,
    connectionStatus,
    updateAlert,
    refreshAlerts: handleRefreshAlerts,
    lastUpdated
  };
};
