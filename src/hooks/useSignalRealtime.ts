
import { useCallback, useState, useEffect, useMemo, useContext } from 'react';
import { useSignalRealtime as useSignalRealtimeContext } from '@/contexts/SignalRealtimeContext';
import { tradingApiService, TradeAlertWithProfile } from '@/api/services/TradingApiService';
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

export const useSignalRealtime = (userId: string, showAllSignals: boolean = false): UseSignalRealtimeReturn => {
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  
  console.log('🔌 useSignalRealtime - Hook called with:', { userId, showAllSignals });
  
  // Get real-time context with comprehensive error handling
  let context;
  try {
    console.log('🔌 useSignalRealtime - Attempting to get context...');
    context = useSignalRealtimeContext();
    console.log('✅ useSignalRealtime - Context obtained successfully:', {
      hasContext: !!context,
      signalsCount: context?.signals?.length || 0,
      connectionStatus: context?.connectionStatus
    });
  } catch (error) {
    console.error('❌ useSignalRealtime - Context error:', error);
    // Provide a fallback context to prevent crashes
    context = {
      signals: [],
      connectionStatus: 'error' as const,
      lastUpdated: null,
      error: `Context initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      nextRetryAt: null,
      subscribe: () => console.warn('SignalRealtimeProvider not available - subscribe'),
      unsubscribe: () => console.warn('SignalRealtimeProvider not available - unsubscribe'),
      refreshSignals: async () => {
        console.warn('SignalRealtimeProvider not available - refreshSignals');
        throw new Error('SignalRealtimeProvider not available');
      }
    };
  }

  // Ensure context is available
  if (!context) {
    console.error('❌ useSignalRealtime - No context available, using fallback');
    context = {
      signals: [],
      connectionStatus: 'disconnected' as const,
      lastUpdated: null,
      error: 'SignalRealtimeProvider not initialized',
      nextRetryAt: null,
      subscribe: () => console.warn('SignalRealtimeProvider not available - subscribe'),
      unsubscribe: () => console.warn('SignalRealtimeProvider not available - unsubscribe'),
      refreshSignals: async () => {
        console.warn('SignalRealtimeProvider not available - refreshSignals');
        throw new Error('SignalRealtimeProvider not available');
      }
    };
  }

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
    console.log('🔍 useSignalRealtime - RLS-filtered signals from context:', {
      totalSignals: allSignals?.length || 0,
      showAllSignals,
      userId: userId || 'empty'
    });

    if (!allSignals || allSignals.length === 0) {
      console.log('📭 useSignalRealtime - No signals available');
      return [];
    }

    // RLS policies handle filtering automatically, so we can return all signals
    // These are already filtered to only show educator/admin signals
    console.log('✅ useSignalRealtime - Returning RLS-filtered signals:', allSignals.length);
    return allSignals;
  }, [allSignals, showAllSignals, userId]);

  // Subscribe to realtime updates - always subscribe since RLS handles filtering
  useEffect(() => {
    console.log('🔌 useSignalRealtime - Setting up subscription to RLS-filtered real-time updates');
    try {
      subscribe();
      console.log('✅ useSignalRealtime - Successfully subscribed to real-time updates');
    } catch (error) {
      console.error('❌ useSignalRealtime - Failed to subscribe:', error);
      setLocalError(`Subscription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return () => {
      console.log('🔌 useSignalRealtime - Cleaning up subscription');
      try {
        unsubscribe();
      } catch (error) {
        console.error('❌ useSignalRealtime - Failed to unsubscribe:', error);
      }
    };
  }, [subscribe, unsubscribe]);

  // Sync realtime error with local error state
  useEffect(() => {
    if (contextError) {
      console.log('❌ useSignalRealtime - Context error updated:', contextError);
    }
    setLocalError(contextError);
  }, [contextError]);

  const updateAlert = useCallback(async (id: string, dto: UpdateTradeAlertDto): Promise<TradeAlertResponseDto | null> => {
    if (!userId || !userId.trim()) {
      console.warn('❌ useSignalRealtime - Cannot update alert: invalid userId');
      setLocalError('Cannot update alert: user not authenticated');
      return null;
    }

    try {
      setLocalLoading(true);
      setLocalError(null);
      console.log('🔄 useSignalRealtime - Updating alert:', { id, dto, userId });
      
      const result = await tradingApiService.updateAlert(id, dto, userId);
      
      if (result.success && result.data) {
        console.log('✅ useSignalRealtime - Alert updated successfully:', result.data);
        // The realtime context will handle the update automatically
        return result.data;
      } else {
        const errorMsg = result.error || 'Failed to update alert';
        console.error('❌ useSignalRealtime - Failed to update alert:', errorMsg);
        setLocalError(errorMsg);
        return null;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ useSignalRealtime - Error updating alert:', error);
      setLocalError(errorMsg);
      return null;
    } finally {
      setLocalLoading(false);
    }
  }, [userId]);

  const handleRefreshAlerts = useCallback(async () => {
    try {
      setLocalLoading(true);
      setLocalError(null);
      console.log('🔄 useSignalRealtime - Manually refreshing RLS-filtered alerts');
      await contextRefreshSignals();
      console.log('✅ useSignalRealtime - Successfully refreshed alerts');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh alerts';
      setLocalError(errorMessage);
      console.error('❌ useSignalRealtime - Failed to refresh alerts:', errorMessage);
    } finally {
      setLocalLoading(false);
    }
  }, [contextRefreshSignals]);

  console.log('📊 useSignalRealtime - Returning hook result:', {
    alertsCount: filteredAlerts.length,
    isLoading,
    error,
    connectionStatus
  });

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
