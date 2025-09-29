import { useSignalStore as useStore, selectSignalsArray, selectConnectionStatus, selectIsLoading, selectError, selectLastUpdated } from '@/store/signalStore';
import { signalActions } from '@/store/signalActions';
import { TradeAlertWithProfile } from '@/api/services/TradingApiService';
import { CreateTradeAlertDto, UpdateTradeAlertDto, TradeAlertResponseDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { useCallback, useMemo } from 'react';

export interface UseSignalStoreReturn {
  // Data
  alerts: TradeAlertWithProfile[];
  signalsMap: Record<string, TradeAlertWithProfile>;
  
  // State
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' | 'polling-fallback';
  lastUpdated: Date | null;
  nextRetryAt: number | null;
  
  // Actions
  createAlert: (dto: CreateTradeAlertDto, userId: string) => Promise<TradeAlertResponseDto | null>;
  updateAlert: (id: string, dto: UpdateTradeAlertDto, userId: string) => Promise<TradeAlertResponseDto | null>;
  closeAlert: (id: string, reason: string, userId: string) => Promise<TradeAlertResponseDto | null>;
  refreshAlerts: (userId: string) => Promise<void>;
  
  // Utility
  clearError: () => void;
}

/**
 * Hook for accessing the signal store with a clean API
 * This provides the same interface as the old useSignalRealtime hook
 */
export const useSignalStore = (userId: string): UseSignalStoreReturn => {
  // Subscribe to store state
  const alerts = useStore(selectSignalsArray);
  const signalsMap = useStore(state => state.signalsMap);
  const isLoading = useStore(selectIsLoading);
  const isRefreshing = useStore(state => state.isRefreshing);
  const error = useStore(selectError);
  const connectionStatus = useStore(selectConnectionStatus);
  const lastUpdated = useStore(selectLastUpdated);
  const nextRetryAt = useStore(state => state.nextRetryAt);
  const clearError = useStore(state => state.clearError);
  
  // Memoized actions to prevent unnecessary re-renders
  const createAlert = useCallback(async (dto: CreateTradeAlertDto, userId: string): Promise<TradeAlertResponseDto | null> => {
    if (!userId || !userId.trim()) {
      console.warn('useSignalStore - Cannot create alert: invalid userId');
      return null;
    }
    
    const result = await signalActions.createSignal(dto, userId);
    return result.success ? result.data || null : null;
  }, []);
  
  const updateAlert = useCallback(async (id: string, dto: UpdateTradeAlertDto, userId: string): Promise<TradeAlertResponseDto | null> => {
    const result = await signalActions.updateSignal(id, dto, userId);
    return result.success ? result.data || null : null;
  }, []);
  
  const closeAlert = useCallback(async (id: string, reason: string, userId: string): Promise<TradeAlertResponseDto | null> => {
    const result = await signalActions.closeSignal(id, reason, userId);
    return result.success ? result.data || null : null;
  }, []);
  
  const refreshAlerts = useCallback(async (userId: string): Promise<void> => {
    if (!userId || !userId.trim()) {
      console.warn('useSignalStore - Cannot refresh alerts: invalid userId');
      return;
    }
    
    await signalActions.refreshSignals(userId);
  }, []);
  
  return useMemo(() => ({
    // Data
    alerts,
    signalsMap,
    
    // State
    isLoading,
    isRefreshing,
    error,
    connectionStatus,
    lastUpdated,
    nextRetryAt,
    
    // Actions
    createAlert,
    updateAlert,
    closeAlert,
    refreshAlerts,
    
    // Utility
    clearError,
  }), [
    alerts,
    signalsMap,
    isLoading,
    isRefreshing,
    error,
    connectionStatus,
    lastUpdated,
    nextRetryAt,
    createAlert,
    updateAlert,
    closeAlert,
    refreshAlerts,
    clearError,
  ]);
};