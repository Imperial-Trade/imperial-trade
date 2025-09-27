import { useCallback, useState, useMemo } from 'react';
import { useSignalRealtime } from './useSignalRealtime';
import { tradingApiService, TradeAlertWithProfile } from '@/api/services/TradingApiService';
import { CreateTradeAlertDto, UpdateTradeAlertDto, TradeAlertResponseDto } from '@/domain/dtos/trading/CreateTradeAlertDto';

interface UseOptimizedTradingRealtimeReturn {
  alerts: TradeAlertWithProfile[];
  isLoading: boolean;
  error: string | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' | 'polling-fallback';
  nextRetryAt: number | null;
  createAlert: (dto: CreateTradeAlertDto) => Promise<boolean>;
  updateAlert: (id: string, dto: UpdateTradeAlertDto) => Promise<TradeAlertResponseDto | null>;
  deleteAlert: (id: string) => Promise<void>;
  refreshAlerts: () => Promise<void>;
  lastUpdated: Date | null;
}

/**
 * Optimized trading realtime hook that combines signal realtime with CRUD operations
 * PHASE 1: Normalized state management for flawless signal lifecycle
 */
export const useOptimizedTradingRealtime = (userId: string, showAllSignals: boolean = false): UseOptimizedTradingRealtimeReturn => {
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Get real-time context with normalized state management
  const {
    alerts: contextAlerts,
    isLoading: contextLoading,
    error: contextError,
    connectionStatus,
    nextRetryAt,
    updateAlert: contextUpdateAlert,
    refreshAlerts: contextRefreshAlerts,
    lastUpdated
  } = useSignalRealtime(userId, showAllSignals);

  // Combine loading and error states
  const isLoading = localLoading || contextLoading;
  const error = localError || contextError;

  // PHASE 1: Alerts are already normalized in context, just pass through
  const alerts = useMemo(() => {
    console.log('useOptimizedTradingRealtime - Processing normalized alerts:', contextAlerts.length);
    return contextAlerts;
  }, [contextAlerts]);

  // PHASE 1: Atomic create operation with instant state updates
  const createAlert = useCallback(async (dto: CreateTradeAlertDto): Promise<boolean> => {
    if (!userId?.trim()) {
      console.warn('useOptimizedTradingRealtime - Cannot create alert: invalid userId');
      setLocalError('Invalid user ID');
      return false;
    }

    try {
      setLocalLoading(true);
      setLocalError(null);
      
      const result = await tradingApiService.createAlert(dto, userId);
      
      if (result.success) {
        // Real-time context will handle the automatic update via WebSocket
        console.log('useOptimizedTradingRealtime - Alert created successfully:', result.data?.id);
        return true;
      } else {
        console.error('useOptimizedTradingRealtime - Failed to create alert:', result.error);
        setLocalError(result.error || 'Failed to create alert');
        return false;
      }
    } catch (error) {
      console.error('useOptimizedTradingRealtime - Error creating alert:', error);
      setLocalError(error instanceof Error ? error.message : 'Unknown error');
      return false;
    } finally {
      setLocalLoading(false);
    }
  }, [userId]);

  // PHASE 1: Atomic update operation
  const updateAlert = useCallback(async (id: string, dto: UpdateTradeAlertDto): Promise<TradeAlertResponseDto | null> => {
    if (!userId?.trim()) {
      console.warn('useOptimizedTradingRealtime - Cannot update alert: invalid userId');
      return null;
    }

    try {
      setLocalLoading(true);
      setLocalError(null);
      
      // Use context update which handles normalization
      const result = await contextUpdateAlert(id, dto);
      
      if (result) {
        console.log('useOptimizedTradingRealtime - Alert updated successfully:', result.id);
        return result;
      } else {
        console.error('useOptimizedTradingRealtime - Failed to update alert');
        setLocalError('Failed to update alert');
        return null;
      }
    } catch (error) {
      console.error('useOptimizedTradingRealtime - Error updating alert:', error);
      setLocalError(error instanceof Error ? error.message : 'Unknown error');
      return null;
    } finally {
      setLocalLoading(false);
    }
  }, [userId, contextUpdateAlert]);

  // PHASE 1: Atomic delete operation  
  const deleteAlert = useCallback(async (id: string): Promise<void> => {
    if (!userId?.trim()) {
      console.warn('useOptimizedTradingRealtime - Cannot delete alert: invalid userId');
      return;
    }

    try {
      setLocalLoading(true);
      setLocalError(null);
      
      const result = await tradingApiService.deleteAlert(id, userId);
      
      if (result.success) {
        // Real-time context will handle the automatic removal via WebSocket
        console.log('useOptimizedTradingRealtime - Alert deleted successfully:', id);
      } else {
        console.error('useOptimizedTradingRealtime - Failed to delete alert:', result.error);
        setLocalError(result.error || 'Failed to delete alert');
      }
    } catch (error) {
      console.error('useOptimizedTradingRealtime - Error deleting alert:', error);
      setLocalError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLocalLoading(false);
    }
  }, [userId]);

  // PHASE 1: Refresh with normalized state handling
  const refreshAlerts = useCallback(async (): Promise<void> => {
    try {
      setLocalLoading(true);
      setLocalError(null);
      console.log('useOptimizedTradingRealtime - Refreshing normalized alerts');
      await contextRefreshAlerts();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh alerts';
      setLocalError(errorMessage);
      console.error('useOptimizedTradingRealtime - Failed to refresh alerts:', errorMessage);
    } finally {
      setLocalLoading(false);
    }
  }, [contextRefreshAlerts]);

  return {
    alerts,
    isLoading,
    error,
    connectionStatus,
    nextRetryAt,
    createAlert,
    updateAlert,
    deleteAlert,
    refreshAlerts,
    lastUpdated
  };
};