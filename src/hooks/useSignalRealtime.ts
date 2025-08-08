
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSignalRealtime as useSignalRealtimeContext } from '@/contexts/SignalRealtimeContext';
import { TradeAlertWithProfile, tradingApiService } from '@/api/services/TradingApiService';
import { UpdateTradeAlertDto, TradeAlertResponseDto } from '@/domain/dtos/trading/CreateTradeAlertDto';

interface UseSignalRealtimeReturn {
  alerts: TradeAlertWithProfile[];
  isLoading: boolean;
  error: string | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  nextRetryAt: number | null;
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
    refreshSignals,
    nextRetryAt
  } = useSignalRealtimeContext();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Since RLS policies now handle filtering, we can return all signals from the context
  // The database will only return educator/admin signals due to the RLS policy
  const filteredAlerts = useMemo(() => {
    console.log('useSignalRealtime - RLS-filtered signals from context:', {
      totalSignals: signals.length,
      showAllSignals,
      userId: userId || 'empty'
    });

    // RLS policies handle filtering automatically, so we can return all signals
    // These are already filtered to only show educator/admin signals
    console.log('useSignalRealtime - Returning RLS-filtered signals:', signals.length);
    return signals;
  }, [signals, showAllSignals, userId]);

  // Subscribe to realtime updates - always subscribe since RLS handles filtering
  useEffect(() => {
    console.log('useSignalRealtime - Subscribing to RLS-filtered real-time updates');
    subscribe();
    
    return () => {
      console.log('useSignalRealtime - Unsubscribing from real-time updates');
      unsubscribe();
    };
  }, [subscribe, unsubscribe]);

  // Sync realtime error with local error state
  useEffect(() => {
    setError(realtimeError);
  }, [realtimeError]);

  const updateAlert = useCallback(async (id: string, dto: UpdateTradeAlertDto): Promise<TradeAlertResponseDto | null> => {
    if (!userId || !userId.trim()) {
      console.warn('useSignalRealtime - Cannot update alert: invalid userId');
      return null;
    }

    try {
      setIsLoading(true);
      const result = await tradingApiService.updateAlert(id, dto, userId);
      
      if (result.success && result.data) {
        // The realtime context will handle the update automatically
        return result.data;
      } else {
        console.error('useSignalRealtime - Failed to update alert:', result.error);
        setError(result.error || 'Failed to update alert');
        return null;
      }
    } catch (error) {
      console.error('useSignalRealtime - Error updating alert:', error);
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
      console.log('useSignalRealtime - Manually refreshing RLS-filtered alerts');
      await refreshSignals();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh alerts';
      setError(errorMessage);
      console.error('useSignalRealtime - Failed to refresh alerts:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [refreshSignals]);

  return {
    alerts: filteredAlerts,
    isLoading,
    error,
    connectionStatus,
    nextRetryAt,
    updateAlert,
    refreshAlerts: handleRefreshAlerts,
    lastUpdated
  };
};
