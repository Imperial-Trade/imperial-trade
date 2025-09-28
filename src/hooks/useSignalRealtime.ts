
import { useCallback, useState, useEffect, useMemo, useContext } from 'react';
import { useSignalRealtime as useSignalRealtimeContext } from '@/contexts/SignalRealtimeContext';
import { tradingApiService, TradeAlertWithProfile } from '@/api/services/TradingApiService';
import { UpdateTradeAlertDto, TradeAlertResponseDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { useSignalStore } from '@/hooks/useSignalStore';
import { isDevToolsEnabled } from '@/utils/featureFlags';

interface UseSignalRealtimeReturn {
  alerts: TradeAlertWithProfile[];
  isLoading: boolean;
  error: string | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' | 'polling-fallback';
  nextRetryAt: number | null;
  updateAlert: (id: string, dto: UpdateTradeAlertDto) => Promise<TradeAlertResponseDto | null>;
  refreshAlerts: () => Promise<void>;
  lastUpdated: Date | null;
}

export const useSignalRealtime = (userId: string, showAllSignals: boolean = false): UseSignalRealtimeReturn => {
  // Feature flag to switch between old and new implementations
  const useNewStore = isDevToolsEnabled(); // Can be changed to a specific flag later
  
  // New store implementation
  const newStoreResult = useSignalStore(userId);
  
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
    refreshSignals: contextRefreshSignals
  } = context;

  // Combine loading and error states
  const isLoading = localLoading;
  const error = localError || contextError;

  // Since RLS policies now handle filtering, we can return all signals from the context
  // The database will only return educator/admin signals due to the RLS policy
  const filteredAlerts = useMemo(() => {
    console.log('useSignalRealtime - RLS-filtered signals from context:', {
      totalSignals: allSignals.length,
      showAllSignals,
      userId: userId || 'empty'
    });

    // RLS policies handle filtering automatically, so we can return all signals
    // These are already filtered to only show educator/admin signals
    console.log('useSignalRealtime - Returning RLS-filtered signals:', allSignals.length);
    return allSignals;
  }, [allSignals, showAllSignals, userId]);

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
    setLocalError(contextError);
  }, [contextError]);

  const updateAlert = useCallback(async (id: string, dto: UpdateTradeAlertDto): Promise<TradeAlertResponseDto | null> => {
    if (!userId || !userId.trim()) {
      console.warn('useSignalRealtime - Cannot update alert: invalid userId');
      return null;
    }

    try {
      setLocalLoading(true);
      const result = await tradingApiService.updateAlert(id, dto, userId);
      
      if (result.success && result.data) {
        // The realtime context will handle the update automatically
        return result.data;
      } else {
        console.error('useSignalRealtime - Failed to update alert:', result.error);
        setLocalError(result.error || 'Failed to update alert');
        return null;
      }
    } catch (error) {
      console.error('useSignalRealtime - Error updating alert:', error);
      setLocalError(error instanceof Error ? error.message : 'Unknown error');
      return null;
    } finally {
      setLocalLoading(false);
    }
  }, [userId]);

  const handleRefreshAlerts = useCallback(async () => {
    try {
      setLocalLoading(true);
      setLocalError(null);
      console.log('useSignalRealtime - Manually refreshing RLS-filtered alerts');
      await contextRefreshSignals();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh alerts';
      setLocalError(errorMessage);
      console.error('useSignalRealtime - Failed to refresh alerts:', errorMessage);
    } finally {
      setLocalLoading(false);
    }
  }, [contextRefreshSignals]);

  // Return new store implementation if flag is enabled
  if (useNewStore) {
    console.log('useSignalRealtime - Using NEW store implementation');
    return {
      alerts: newStoreResult.alerts,
      isLoading: newStoreResult.isLoading,
      error: newStoreResult.error,
      connectionStatus: newStoreResult.connectionStatus,
      nextRetryAt: newStoreResult.nextRetryAt,
      updateAlert: (id: string, dto: UpdateTradeAlertDto) => newStoreResult.updateAlert(id, dto, userId),
      refreshAlerts: () => newStoreResult.refreshAlerts(userId),
      lastUpdated: newStoreResult.lastUpdated
    };
  }

  // Legacy implementation (unchanged)
  console.log('useSignalRealtime - Using LEGACY context implementation');
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
