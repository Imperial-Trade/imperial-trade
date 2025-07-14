
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
    console.log('useSignalRealtime - Filtering signals:', {
      totalSignals: signals.length,
      showAllSignals,
      userId: userId || 'empty',
      userIdProvided: Boolean(userId && userId.trim() !== '')
    });

    // If showAllSignals is true, return all signals (this is the primary use case for Signal Stream)
    if (showAllSignals) {
      console.log('useSignalRealtime - Returning all signals for global view:', signals.length);
      return signals;
    }
    
    // If no userId provided and showAllSignals is false, return empty array
    if (!userId || userId.trim() === '') {
      console.log('useSignalRealtime - No userId provided and showAllSignals is false, returning empty array');
      return [];
    }
    
    // Filter by specific user
    const userSignals = signals.filter(signal => signal.creator?.id === userId);
    console.log('useSignalRealtime - Filtered signals for user:', {
      userId,
      userSignals: userSignals.length,
      totalSignals: signals.length
    });
    
    return userSignals;
  }, [signals, showAllSignals, userId]);

  // Subscribe to realtime updates on mount - always subscribe for global signals
  useEffect(() => {
    console.log('useSignalRealtime - Effect triggered:', {
      showAllSignals,
      userId: userId || 'empty',
      shouldSubscribe: showAllSignals || (userId && userId.trim() !== '')
    });

    // Subscribe if we want all signals OR have a specific user ID
    if (showAllSignals || (userId && userId.trim() !== '')) {
      console.log('useSignalRealtime - Subscribing to real-time updates');
      subscribe();
      
      return () => {
        console.log('useSignalRealtime - Unsubscribing from real-time updates');
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
      console.log('useSignalRealtime - Manually refreshing alerts');
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
    updateAlert,
    refreshAlerts: handleRefreshAlerts,
    lastUpdated
  };
};
