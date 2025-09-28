import { tradingApiService, TradeAlertWithProfile } from '@/api/services/TradingApiService';
import { CreateTradeAlertDto, UpdateTradeAlertDto, TradeAlertResponseDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { useSignalStore } from './signalStore';

export interface SignalOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Signal Actions - Centralized operations for signal management
 * These actions handle optimistic updates and error recovery
 */
export class SignalActions {
  private static instance: SignalActions;
  
  static getInstance(): SignalActions {
    if (!SignalActions.instance) {
      SignalActions.instance = new SignalActions();
    }
    return SignalActions.instance;
  }
  
  /**
   * Create a new signal with optimistic update
   */
  async createSignal(dto: CreateTradeAlertDto, userId: string): Promise<SignalOperationResult<TradeAlertResponseDto>> {
    const store = useSignalStore.getState();
    
    try {
      store.setLoading(true);
      store.clearError();
      
      const result = await tradingApiService.createAlert(dto, userId);
      
      if (result.success && result.data) {
        // The real-time subscription will handle adding the signal to the store
        return {
          success: true,
          data: result.data
        };
      } else {
        store.setError(result.error || 'Failed to create signal');
        return {
          success: false,
          error: result.error || 'Failed to create signal'
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      store.setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      store.setLoading(false);
    }
  }
  
  /**
   * Update an existing signal with optimistic update
   */
  async updateSignal(id: string, dto: UpdateTradeAlertDto, userId: string): Promise<SignalOperationResult<TradeAlertResponseDto>> {
    const store = useSignalStore.getState();
    const originalSignal = store.signalsMap[id];
    
    if (!originalSignal) {
      return {
        success: false,
        error: 'Signal not found'
      };
    }
    
    try {
      store.setLoading(true);
      store.clearError();
      
      // Optimistic update - create predicted signal state
      const optimisticSignal: TradeAlertWithProfile = {
        ...originalSignal,
        ...dto,
        updatedAt: new Date().toISOString()
      };
      
      // Apply optimistic update
      store.updateSignal(optimisticSignal);
      
      // Make API call
      const result = await tradingApiService.updateAlert(id, dto, userId);
      
      if (result.success && result.data) {
        // Real-time subscription will provide the actual updated data
        return {
          success: true,
          data: result.data
        };
      } else {
        // Rollback optimistic update on failure
        store.updateSignal(originalSignal);
        store.setError(result.error || 'Failed to update signal');
        return {
          success: false,
          error: result.error || 'Failed to update signal'
        };
      }
    } catch (error) {
      // Rollback optimistic update on error
      store.updateSignal(originalSignal);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      store.setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      store.setLoading(false);
    }
  }
  
  /**
   * Close a signal (special case of update)
   */
  async closeSignal(id: string, reason: string, userId: string): Promise<SignalOperationResult<TradeAlertResponseDto>> {
    return this.updateSignal(id, {
      status: 'closed',
      closeReason: reason as any
    }, userId);
  }
  
  /**
   * Refresh signals from server
   */
  async refreshSignals(userId: string): Promise<SignalOperationResult<TradeAlertWithProfile[]>> {
    const store = useSignalStore.getState();
    
    try {
      store.setRefreshing(true);
      store.clearError();
      
      const result = await tradingApiService.getAllAlerts(userId);
      
      if (result.success && result.data) {
        store.setSignals(result.data);
        return {
          success: true,
          data: result.data
        };
      } else {
        store.setError(result.error || 'Failed to refresh signals');
        return {
          success: false,
          error: result.error || 'Failed to refresh signals'
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      store.setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      store.setRefreshing(false);
    }
  }
  
  /**
   * Handle real-time signal updates from subscriptions
   */
  handleRealtimeUpdate(signal: TradeAlertWithProfile, operation: 'INSERT' | 'UPDATE' | 'DELETE'): void {
    const store = useSignalStore.getState();
    
    switch (operation) {
      case 'INSERT':
        store.updateSignal(signal);
        break;
      case 'UPDATE':
        store.updateSignal(signal);
        break;
      case 'DELETE':
        store.removeSignal(signal.id);
        break;
    }
  }
  
  /**
   * Batch update multiple signals (for efficiency)
   */
  handleBatchUpdate(signals: TradeAlertWithProfile[]): void {
    const store = useSignalStore.getState();
    store.setSignals(signals);
  }
}

// Export singleton instance
export const signalActions = SignalActions.getInstance();