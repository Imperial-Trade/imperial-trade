import { supabase } from '@/integrations/supabase/client';
import { useSignalStore } from './signalStore';
import { signalActions } from './signalActions';
import { TradeAlertWithProfile } from '@/api/services/TradingApiService';
import { transformTradeAlertWithProfile } from '@/utils/dataTransformers';

/**
 * Real-time Integration Bridge for Zustand Signal Store
 * Connects Supabase real-time events to the Zustand store
 */
export class RealtimeIntegration {
  private static instance: RealtimeIntegration;
  private subscription: any = null;
  private connectionHealthInterval: NodeJS.Timeout | null = null;
  private isConnected = false;

  static getInstance(): RealtimeIntegration {
    if (!RealtimeIntegration.instance) {
      RealtimeIntegration.instance = new RealtimeIntegration();
    }
    return RealtimeIntegration.instance;
  }

  /**
   * Start real-time subscription and connect to store
   */
  async connect(userId: string): Promise<void> {
    if (this.subscription) {
      this.disconnect();
    }

    try {
      const store = useSignalStore.getState();
      store.setConnectionStatus('connecting');
      store.clearError();

      console.log('🔗 Starting real-time subscription for signals...');

      this.subscription = supabase
        .channel('trade_alerts_realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'trade_alerts',
          },
          this.handleRealtimeEvent.bind(this)
        )
        .subscribe((status) => {
          console.log('📡 Real-time subscription status:', status);
          
          if (status === 'SUBSCRIBED') {
            this.isConnected = true;
            store.setConnectionStatus('connected');
            store.setLastUpdated(new Date());
            this.startConnectionHealthCheck();
          } else if (status === 'CHANNEL_ERROR') {
            this.isConnected = false;
            store.setConnectionStatus('error');
            store.setError('Real-time connection error');
          } else if (status === 'TIMED_OUT') {
            this.isConnected = false;
            store.setConnectionStatus('polling-fallback');
            store.setError('Connection timed out, using polling fallback');
          }
        });

      // Initial data load
      await signalActions.refreshSignals(userId);

    } catch (error) {
      console.error('❌ Failed to connect real-time:', error);
      const store = useSignalStore.getState();
      store.setConnectionStatus('error');
      store.setError(error instanceof Error ? error.message : 'Connection failed');
    }
  }

  /**
   * Disconnect real-time subscription
   */
  disconnect(): void {
    if (this.subscription) {
      console.log('🔌 Disconnecting real-time subscription...');
      supabase.removeChannel(this.subscription);
      this.subscription = null;
    }

    if (this.connectionHealthInterval) {
      clearInterval(this.connectionHealthInterval);
      this.connectionHealthInterval = null;
    }

    this.isConnected = false;
    const store = useSignalStore.getState();
    store.setConnectionStatus('disconnected');
  }

  /**
   * Handle real-time events from Supabase
   */
  private handleRealtimeEvent(payload: any): void {
    console.log('📨 Real-time event received:', payload.eventType, payload.new?.id);

    try {
      const store = useSignalStore.getState();

      switch (payload.eventType) {
        case 'INSERT':
          if (payload.new) {
            const signal = this.transformPayload(payload.new);
            signalActions.handleRealtimeUpdate(signal, 'INSERT');
          }
          break;

        case 'UPDATE':
          if (payload.new) {
            const signal = this.transformPayload(payload.new);
            signalActions.handleRealtimeUpdate(signal, 'UPDATE');
          }
          break;

        case 'DELETE':
          if (payload.old?.id) {
            signalActions.handleRealtimeUpdate({ id: payload.old.id } as any, 'DELETE');
          }
          break;

        default:
          console.warn('⚠️ Unknown real-time event type:', payload.eventType);
      }

      store.setLastUpdated(new Date());
      store.clearError();

    } catch (error) {
      console.error('❌ Error handling real-time event:', error);
      const store = useSignalStore.getState();
      store.setError('Failed to process real-time update');
    }
  }

  /**
   * Transform raw Supabase payload to TradeAlertWithProfile
   */
  private transformPayload(payload: any): TradeAlertWithProfile {
    // If payload already has profile data, use transformTradeAlertWithProfile
    if (payload.profiles) {
      return transformTradeAlertWithProfile(payload);
    }

    // Otherwise, create a basic signal (profile will be fetched separately if needed)
    return {
      id: payload.id,
      userId: payload.user_id,
      assetName: payload.asset_name,
      tradermadeSymbol: payload.tradermade_symbol,
      tradeType: payload.trade_type,
      entryPrice: payload.entry_price,
      stopLoss: payload.stop_loss,
      status: payload.status,
      tp1: payload.tp1,
      tp2: payload.tp2,
      tp3: payload.tp3,
      tp4: payload.tp4,
      tp5: payload.tp5,
      tpHits: payload.tp_hits || [],
      notes: payload.notes,
      closeReason: payload.close_reason,
      createdAt: payload.created_at,
      updatedAt: payload.updated_at,
    };
  }

  /**
   * Start connection health monitoring
   */
  private startConnectionHealthCheck(): void {
    if (this.connectionHealthInterval) {
      clearInterval(this.connectionHealthInterval);
    }

    this.connectionHealthInterval = setInterval(() => {
      if (!this.isConnected) {
        const store = useSignalStore.getState();
        store.setConnectionStatus('error');
        store.setError('Connection lost');
        this.disconnect();
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): { isConnected: boolean; subscription: any } {
    return {
      isConnected: this.isConnected,
      subscription: this.subscription
    };
  }
}

// Export singleton instance
export const realtimeIntegration = RealtimeIntegration.getInstance();
