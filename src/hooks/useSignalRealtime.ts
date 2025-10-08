
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

  // ✅ PHASE 2C (BUG #20 FIX): Fixed subscription loop with stable callbacks
  // Wrap subscribe/unsubscribe in stable useCallback to prevent infinite loops
  const stableSubscribe = useCallback(() => {
    console.log('useSignalRealtime - Subscribing to RLS-filtered real-time updates');
    subscribe();
  }, [subscribe]);

  const stableUnsubscribe = useCallback(() => {
    console.log('useSignalRealtime - Unsubscribing from real-time updates');
    unsubscribe();
  }, [unsubscribe]);

  useEffect(() => {
    stableSubscribe();
    
    return () => {
      stableUnsubscribe();
    };
  }, [stableSubscribe, stableUnsubscribe]); // ✅ BUG #20 FIXED: Proper dependencies

  // Sync realtime error with local error state
  useEffect(() => {
    setLocalError(contextError);
  }, [contextError]);

  const updateAlert = useCallback(async (id: string, dto: UpdateTradeAlertDto): Promise<TradeAlertResponseDto | null> => {
    console.log('🔍 [useSignalRealtime] updateAlert called:', { 
      id, 
      dto, 
      userId,
      userIdValid: !!(userId && userId.trim())
    });
    
    if (!userId || !userId.trim()) {
      console.error('❌ [useSignalRealtime] Invalid userId:', userId);
      setLocalError('User not authenticated');
      return null;
    }

    try {
      setLocalLoading(true);
      console.log('📤 [useSignalRealtime] Calling tradingApiService.updateAlert...');
      
      const result = await tradingApiService.updateAlert(id, dto, userId);
      
      console.log('📥 [useSignalRealtime] API result:', {
        success: result.success,
        hasData: !!result.data,
        error: result.error,
        resultData: result.data
      });
      
      if (result.success && result.data) {
        console.log('✅ [useSignalRealtime] Update successful');
        return result.data;
      } else {
        console.error('❌ [useSignalRealtime] Update failed:', result.error);
        setLocalError(result.error || 'Failed to update alert');
        return null;
      }
    } catch (error) {
      console.error('💥 [useSignalRealtime] Exception thrown:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLocalError(errorMessage);
      return null;
    } finally {
      console.log('🏁 [useSignalRealtime] updateAlert completed, setting loading to false');
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
