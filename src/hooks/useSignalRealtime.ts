
import { useCallback, useState, useEffect, useMemo } from 'react';
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
  
  console.log('🔗 useSignalRealtime hook called with:', { userId, showAllSignals });
  
  // Get real-time context with safe fallback
  const context = useSignalRealtimeContext();
  
  if (!context) {
    console.error('❌ SignalRealtimeContext not found - ensure component is wrapped in SignalRealtimeProvider');
    return {
      alerts: [],
      isLoading: false,
      error: 'SignalRealtimeContext not available',
      connectionStatus: 'error',
      nextRetryAt: null,
      updateAlert: async () => null,
      refreshAlerts: async () => {},
      lastUpdated: null
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

  console.log('📡 useSignalRealtime context data:', {
    signalsCount: allSignals.length,
    connectionStatus,
    error: contextError,
    lastUpdated,
    hasValidSignals: allSignals.filter(s => s && s.id).length
  });

  // Combine loading and error states
  const isLoading = localLoading;
  const error = localError || contextError;

  // Validate and filter signals
  const filteredAlerts = useMemo(() => {
    console.log('🔍 useSignalRealtime - Processing signals from context:', {
      totalSignals: allSignals.length,
      showAllSignals,
      userId: userId || 'empty'
    });

    // Filter out invalid signals and log them
    const validSignals = allSignals.filter(signal => {
      if (!signal || !signal.id) {
        console.warn('⚠️ Invalid signal detected:', signal);
        return false;
      }
      return true;
    });

    console.log('✅ useSignalRealtime - Valid signals after filtering:', validSignals.length);
    
    // Log each valid signal for debugging
    validSignals.forEach((signal, index) => {
      console.log(`📊 Valid Signal ${index + 1}:`, {
        id: signal.id,
        assetName: signal.assetName,
        status: signal.status,
        creator: signal.creator?.display_name,
        hasRequiredFields: !!(signal.assetName && signal.entryPrice && signal.stopLoss)
      });
    });
    
    return validSignals;
  }, [allSignals, showAllSignals, userId]);

  // Subscribe to realtime updates
  useEffect(() => {
    console.log('🔌 useSignalRealtime - Subscribing to real-time updates');
    subscribe();
    
    return () => {
      console.log('🔌 useSignalRealtime - Unsubscribing from real-time updates');
      unsubscribe();
    };
  }, [subscribe, unsubscribe]);

  // Sync realtime error with local error state
  useEffect(() => {
    if (contextError) {
      console.error('❌ useSignalRealtime - Context error:', contextError);
    }
    setLocalError(contextError);
  }, [contextError]);

  const updateAlert = useCallback(async (id: string, dto: UpdateTradeAlertDto): Promise<TradeAlertResponseDto | null> => {
    if (!userId || !userId.trim()) {
      console.warn('useSignalRealtime - Cannot update alert: invalid userId');
      setLocalError('User not authenticated');
      return null;
    }

    if (!id || !id.trim()) {
      console.warn('useSignalRealtime - Cannot update alert: invalid alert ID');
      setLocalError('Invalid alert ID');
      return null;
    }

    try {
      setLocalLoading(true);
      setLocalError(null);
      console.log('📝 useSignalRealtime - Updating alert:', id, dto);
      
      const result = await tradingApiService.updateAlert(id, dto, userId);
      
      if (result.success && result.data) {
        console.log('✅ useSignalRealtime - Alert updated successfully:', result.data);
        return result.data;
      } else {
        const errorMsg = result.error || 'Failed to update alert';
        console.error('❌ useSignalRealtime - Failed to update alert:', errorMsg);
        setLocalError(errorMsg);
        return null;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error updating alert';
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
      console.log('🔄 useSignalRealtime - Manually refreshing alerts');
      await contextRefreshSignals();
      console.log('✅ useSignalRealtime - Alerts refreshed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh alerts';
      setLocalError(errorMessage);
      console.error('❌ useSignalRealtime - Failed to refresh alerts:', errorMessage);
    } finally {
      setLocalLoading(false);
    }
  }, [contextRefreshSignals]);

  console.log('📤 useSignalRealtime - Returning data:', {
    alertsCount: filteredAlerts.length,
    isLoading,
    error,
    connectionStatus,
    validAlerts: filteredAlerts.filter(a => a.assetName && a.entryPrice).length
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
