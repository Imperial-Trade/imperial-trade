import { useState, useCallback, useEffect } from 'react';
import { useSignalRealtime as useSignalRealtimeContext } from '@/contexts/SignalRealtimeContext';
import { TradingApiService, tradingApiService } from '@/api/services/TradingApiService';
import { TradeAlertWithProfile } from '@/types/trading';

interface UseSignalRealtimeReturn {
  alerts: TradeAlertWithProfile[];
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  error: string | null;
  updateAlert: (id: string, data: { status: string }) => Promise<TradeAlertWithProfile | null>;
  refreshAlerts: () => Promise<void>;
}

export const useSignalRealtime = (userId: string, showAllSignals: boolean): UseSignalRealtimeReturn => {
  const { signals, connectionStatus, error, subscribe, unsubscribe, refreshSignals } = useSignalRealtimeContext();
  const [filteredSignals, setFilteredSignals] = useState<TradeAlertWithProfile[]>([]);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    subscribe(); // Subscribe on mount

    return () => {
      unsubscribe(); // Unsubscribe on unmount
    };
  }, [subscribe, unsubscribe]);

  useEffect(() => {
    if (showAllSignals) {
      setFilteredSignals(signals);
    } else {
      const filtered = signals.filter(signal => signal.creator?.id === userId);
      setFilteredSignals(filtered);
    }
  }, [signals, userId, showAllSignals]);

  const updateAlert = useCallback(async (id: string, data: { status: string }) => {
    if (!userId) {
      console.warn('Cannot update alert: missing userId');
      return null;
    }

    try {
      setUpdateError(null);
      const result = await tradingApiService.updateTradeAlert(id, data);

      if (!result) {
        setUpdateError('Failed to update alert');
        return null;
      }

      return result;
    } catch (err: any) {
      console.error('Error updating trade alert:', err);
      setUpdateError(err.message || 'Failed to update trade alert');
      return null;
    }
  }, [userId]);

  const refreshAlerts = useCallback(async () => {
    try {
      setUpdateError(null);
      await refreshSignals();
    } catch (err: any) {
      console.error('Error refreshing signals:', err);
      setUpdateError(err.message || 'Failed to refresh signals');
    }
  }, [refreshSignals]);

  return {
    alerts: filteredSignals,
    connectionStatus,
    error: error || updateError,
    updateAlert,
    refreshAlerts
  };
};
