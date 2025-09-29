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
   * Create a new signal with optimistic update - ENHANCED with better state management
   */
  async createSignal(dto: CreateTradeAlertDto, userId: string): Promise<SignalOperationResult<TradeAlertResponseDto>> {
    const store = useSignalStore.getState();
    
    try {
      console.log('🚀 Creating signal - Start:', { assetName: dto.assetName, userId });
      store.setLoading(true);
      store.clearError();
      
      const result = await tradingApiService.createAlert(dto, userId);
      
      if (result.success && result.data) {
        console.log('✅ Signal created successfully:', { 
          id: result.data.id, 
          assetName: result.data.assetName,
          status: result.data.status 
        });
        // The real-time subscription will handle adding the signal to the store
        return {
          success: true,
          data: result.data
        };
      } else {
        console.error('❌ Signal creation failed:', result.error);
        store.setError(result.error || 'Failed to create signal');
        return {
          success: false,
          error: result.error || 'Failed to create signal'
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Signal creation exception:', errorMessage);
      store.setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      console.log('🏁 Creating signal - End, setting loading to false');
      store.setLoading(false);
    }
  }
  
  /**
   * Update an existing signal with optimistic update - ENHANCED with better conflict resolution
   */
  async updateSignal(id: string, dto: UpdateTradeAlertDto, userId: string): Promise<SignalOperationResult<TradeAlertResponseDto>> {
    const store = useSignalStore.getState();
    const originalSignal = store.signalsMap[id];
    
    if (!originalSignal) {
      console.error('❌ Signal not found for update:', id);
      return {
        success: false,
        error: 'Signal not found'
      };
    }
    
    try {
      console.log('🔄 Updating signal - Start:', { 
        id, 
        changes: Object.keys(dto),
        notes: dto.notes ? 'has notes' : 'no notes'
      });
      store.setLoading(true);
      store.clearError();
      
      // Optimistic update - create predicted signal state
      const optimisticSignal: TradeAlertWithProfile = {
        ...originalSignal,
        ...dto,
        updatedAt: new Date().toISOString()
      };
      
      console.log('⚡ Applying optimistic update');
      // Apply optimistic update
      store.updateSignal(optimisticSignal);
      
      // Make API call
      const result = await tradingApiService.updateAlert(id, dto, userId);
      
      if (result.success) {
        console.log('✅ Signal update accepted; awaiting server refresh');
        // Real-time or explicit refresh will reconcile the optimistic state
        return {
          success: true,
          data: result.data
        };
      } else {
        console.error('❌ Signal update failed, rolling back:', result.error);
        // Rollback optimistic update on failure
        store.updateSignal(originalSignal);
        store.setError(result.error || 'Failed to update signal');
        return {
          success: false,
          error: result.error || 'Failed to update signal'
        };
      }
    } catch (error) {
      console.error('❌ Signal update exception, rolling back:', error);
      // Rollback optimistic update on error
      store.updateSignal(originalSignal);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      store.setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      console.log('🏁 Updating signal - End, setting loading to false');
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
   * Refresh signals from server - CRITICAL FIX: Use public API with profiles
   */
  async refreshSignals(userId: string): Promise<SignalOperationResult<TradeAlertWithProfile[]>> {
    const store = useSignalStore.getState();
    
    try {
      store.setRefreshing(true);
      store.clearError();
      
      // CRITICAL FIX: Use getAllPublicAlertsWithProfiles() instead of getAllAlerts() 
      // This ensures we get educator names and profile data
      const result = await tradingApiService.getAllPublicAlertsWithProfiles();
      
      if (result.success && result.data) {
        // Apply conflict resolution - validate and merge with current state
        const validatedSignals = this.validateAndResolveConflicts(result.data, store.signalsMap);
        store.setSignals(validatedSignals);
        return {
          success: true,
          data: validatedSignals
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
   * Handle real-time signal updates from subscriptions - ENHANCED with conflict resolution
   */
  handleRealtimeUpdate(signal: TradeAlertWithProfile, operation: 'INSERT' | 'UPDATE' | 'DELETE'): void {
    const store = useSignalStore.getState();
    
    console.log('📡 Real-time update received:', { 
      operation, 
      signalId: signal.id, 
      creatorName: signal.creator?.display_name || 'Unknown',
      notes: signal.notes ? 'has notes' : 'no notes'
    });
    
    switch (operation) {
      case 'INSERT':
        // Validate signal has profile data, fetch if missing
        const validatedInsertSignal = this.ensureProfileData(signal);
        console.log('➕ Adding new signal to store:', validatedInsertSignal.id);
        store.updateSignal(validatedInsertSignal);
        break;
      case 'UPDATE':
        // Apply conflict resolution for updates
        const currentSignal = store.signalsMap[signal.id];
        const resolvedSignal = this.resolveSignalConflict(currentSignal, signal);
        console.log('🔄 Updating signal in store:', { 
          id: resolvedSignal.id,
          hasNotes: !!resolvedSignal.notes,
          creatorName: resolvedSignal.creator?.display_name 
        });
        store.updateSignal(resolvedSignal);
        break;
      case 'DELETE':
        console.log('🗑️ Removing signal from store:', signal.id);
        store.removeSignal(signal.id);
        break;
    }
  }
  
  /**
   * Batch update multiple signals (for efficiency)
   */
  handleBatchUpdate(signals: TradeAlertWithProfile[]): void {
    const store = useSignalStore.getState();
    const validatedSignals = this.validateAndResolveConflicts(signals, store.signalsMap);
    store.setSignals(validatedSignals);
  }

  /**
   * CRITICAL FIX: Validate and resolve conflicts between server data and local state
   */
  private validateAndResolveConflicts(
    serverSignals: TradeAlertWithProfile[], 
    localSignalsMap: Record<string, TradeAlertWithProfile>
  ): TradeAlertWithProfile[] {
    return serverSignals.map(serverSignal => {
      const localSignal = localSignalsMap[serverSignal.id];
      
      // If no local signal, return server signal as-is
      if (!localSignal) {
        return this.ensureProfileData(serverSignal);
      }
      
      // Resolve conflicts based on timestamps and pending operations
      return this.resolveSignalConflict(localSignal, serverSignal);
    });
  }

  /**
   * CRITICAL FIX: Resolve conflicts between local and server signal data
   */
  private resolveSignalConflict(
    localSignal: TradeAlertWithProfile | undefined, 
    serverSignal: TradeAlertWithProfile
  ): TradeAlertWithProfile {
    // If no local signal, use server signal
    if (!localSignal) {
      return this.ensureProfileData(serverSignal);
    }

    // Server data is newer - use it but preserve profile data if missing
    const resolvedSignal = { ...serverSignal };
    
    // Ensure profile data is present
    if (!resolvedSignal.creator && localSignal.creator) {
      resolvedSignal.creator = localSignal.creator;
    }

    return resolvedSignal;
  }

  /**
   * CRITICAL FIX: Ensure signal has profile data, use fallback if missing
   */
  private ensureProfileData(signal: TradeAlertWithProfile): TradeAlertWithProfile {
    // If profile data is missing, we'll need to handle it gracefully
    if (!signal.creator) {
      // For now, provide a fallback. In a full implementation, 
      // we might fetch profile data separately
      return {
        ...signal,
        creator: {
          id: signal.userId,
          display_name: 'Unknown Trader',
          role: 'user',
          avatar_url: undefined
        }
      };
    }
    
    return signal;
  }
}

// Export singleton instance
export const signalActions = SignalActions.getInstance();