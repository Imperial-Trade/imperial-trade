
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
  refreshAlerts: (bypassThrottle?: boolean) => Promise<void>;
  lastUpdated: Date | null;
  getSignalById: (signalId: string) => TradeAlertWithProfile | undefined;
  lastUpdatePayload: any | null;  // ✅ TIER 0 FIX: Expose latest UPDATE payload
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
    getSignalById,
    lastUpdatePayload  // ✅ TIER 0 FIX: Get latest UPDATE payload
  } = context;

  // Combine loading and error states
  const isLoading = localLoading;
  const error = localError || contextError;

  // Filter signals - RLS policies handle educator/admin filtering
  // Convert Signal type to TradeAlertWithProfile type
  const filteredAlerts = useMemo(() => {
    return allSignals.map(signal => ({
      ...signal,
      userId: signal.user_id,
      assetName: signal.asset_name,
      tradermadeSymbol: signal.tradermade_symbol,
      tradeType: signal.trade_type,
      entryPrice: signal.entry_price,
      stopLoss: signal.stop_loss,
      createdAt: signal.created_at,
      updatedAt: signal.updated_at,
      tpHits: signal.tp_hits || [],
      closeReason: signal.close_reason
    })) as unknown as TradeAlertWithProfile[];
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

  const handleRefreshAlerts = useCallback(async (bypassThrottle?: boolean) => {
    try {
      setLocalLoading(true);
      setLocalError(null);
      await contextRefreshSignals(bypassThrottle);
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
    lastUpdatePayload,  // ✅ TIER 0 FIX: Expose latest UPDATE payload
    getSignalById: (signalId: string) => {
      const signal = getSignalById(signalId);
      if (!signal) return undefined;
      return {
        ...signal,
        userId: signal.user_id,
        assetName: signal.asset_name,
        tradermadeSymbol: signal.tradermade_symbol,
        tradeType: signal.trade_type,
        entryPrice: signal.entry_price,
        stopLoss: signal.stop_loss,
        createdAt: signal.created_at,
        updatedAt: signal.updated_at,
        tpHits: signal.tp_hits || [],
        closeReason: signal.close_reason
      } as unknown as TradeAlertWithProfile;
    }
  };
};
