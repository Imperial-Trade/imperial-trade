
import { useCallback, useState, useEffect, useMemo, useContext } from 'react';
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

  // Since RLS policies now handle filtering, we can return all signals from the context
  // RLS policies handle filtering automatically, so we can return all signals
  // These are already filtered to only show educator/admin signals
  const filteredAlerts = useMemo(() => {
    console.log('🔍 DEBUG [useSignalRealtime] Signals from context:', {
      totalSignals: allSignals.length,
      showAllSignals,
      userId: userId || 'empty',
      firstSignalId: allSignals[0]?.id || 'no signals',
      signalStatuses: allSignals.slice(0, 5).map(s => `${s.tradermadeSymbol}:${s.status}`)
    });

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
  }, []); // PHASE 6: Remove subscribe/unsubscribe to prevent hook-level subscription loops

  // Sync realtime error with local error state
  useEffect(() => {
    setLocalError(contextError);
  }, [contextError]);

  const updateAlert = useCallback(async (id: string, dto: UpdateTradeAlertDto): Promise<TradeAlertResponseDto | null> => {
    // ✅ CRITICAL FIX: Pre-flight validation for userId
    if (!userId || !userId.trim()) {
      const errorMsg = 'Cannot update alert: User ID is missing or invalid';
      console.error('❌ [useSignalRealtime] PRE-FLIGHT CHECK FAILED:', {
        userId,
        alertId: id,
        updateData: dto
      });
      setLocalError(errorMsg);
      throw new Error(errorMsg);
    }

    console.log('🚀 [useSignalRealtime] Initiating alert update:', {
      alertId: id,
      userId,
      updateFields: Object.keys(dto)
    });

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
