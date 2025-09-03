import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessedAlert {
  alert_id: string;
  signal_id: string;
  alert_type: string;
  action: string;
  price: number;
  tp_level?: number;
  reason?: string;
}

// Realtime-only Alert Monitor
class RealtimeAlertMonitor {
  private supabase: any;
  private subscription: any;
  private processingActive = false;
  
  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing Realtime-only Alert Monitor...');
    console.log('📡 Consuming live prices from enhanced-websocket-streaming via Supabase Realtime');
    
    // Subscribe to price updates from enhanced-websocket-streaming
    this.subscription = this.supabase
      .channel('prices:live')
      .on('broadcast', { event: 'price_update' }, async (payload: any) => {
        if (!this.processingActive && payload.payload) {
          await this.handlePriceUpdate(payload.payload);
        }
      })
      .subscribe((status: string) => {
        console.log('📡 Realtime subscription status:', status);
      });
  }

  private async handlePriceUpdate(priceData: any): Promise<void> {
    if (this.processingActive) return;
    
    try {
      this.processingActive = true;
      
      // Process alerts using enhanced function with bid/ask precision
      const { data: triggeredAlerts, error: alertError } = await this.supabase
        .rpc('process_price_alerts_enhanced', {
          p_symbol: priceData.symbol,
          p_current_bid: priceData.bid,
          p_current_ask: priceData.ask
        });

      if (alertError) {
        console.error('❌ Alert processing error:', alertError.message);
        return;
      }

      // Handle triggered alerts
      if (triggeredAlerts && triggeredAlerts.length > 0) {
        const processedAlerts: ProcessedAlert[] = [];
        
        for (const alert of triggeredAlerts) {
          if (alert.triggered) {
            const { data: result, error: handleError } = await this.supabase
              .rpc('handle_triggered_alert_enhanced', {
                p_alert_id: alert.alert_id,
                p_signal_id: alert.signal_id,
                p_alert_type: alert.alert_type,
                p_triggered_price: alert.trigger_price
              });

            if (!handleError && result) {
              processedAlerts.push({
                alert_id: alert.alert_id,
                signal_id: alert.signal_id,
                alert_type: alert.alert_type,
                action: result.action,
                price: alert.trigger_price,
                tp_level: result.tp_level,
                reason: result.reason
              });
            }
          }
        }

        // Send notifications for processed alerts
        if (processedAlerts.length > 0) {
          await this.broadcastAlertNotifications(processedAlerts, priceData);
        }
      }

    } catch (error) {
      console.error('❌ Error processing price update:', error);
    } finally {
      this.processingActive = false;
    }
  }

  private async broadcastAlertNotifications(alerts: ProcessedAlert[], priceData: any): Promise<void> {
    try {
      const notificationPayload = {
        notifications: alerts.map(alert => ({
          signal_id: alert.signal_id,
          notification_type: alert.alert_type,
          asset_name: priceData.symbol,
          triggered_price: priceData.price,
          alert_type: alert.alert_type,
          action: alert.action,
          tp_level: alert.tp_level,
          delivery_channels: ['push', 'in_app'],
          include_creator: false
        }))
      };

      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      const functionUrl = 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/signal-notification-dispatcher';
      
      // Fire and forget to avoid blocking
      fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify(notificationPayload)
      }).catch(err => {
        console.error('❌ Notification dispatch failed:', err.message);
      });

    } catch (error) {
      console.error('❌ Notification error:', error);
    }
  }

  async healthCheck(): Promise<{ status: string; mode: string; subscription: string }> {
    return {
      status: 'operational',
      mode: 'realtime-only',
      subscription: this.subscription ? 'active' : 'inactive'
    };
  }

  disconnect(): void {
    if (this.subscription) {
      this.supabase.removeChannel(this.subscription);
      this.subscription = null;
    }
  }
}

// Global monitor instance
let monitor: RealtimeAlertMonitor | null = null;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = 'https://kmuoqkcxguafxulqlbmi.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not found');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize monitor if not already running
    if (!monitor) {
      monitor = new RealtimeAlertMonitor(supabase);
      await monitor.initialize();
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'status';

    switch (action) {
      case 'status':
        const health = await monitor.healthCheck();
        return new Response(JSON.stringify({
          status: 'operational',
          version: '3.0.0-realtime-only',
          monitor: health,
          timestamp: new Date().toISOString(),
          message: 'Realtime-only alert monitoring active - consuming from enhanced-websocket-streaming'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'restart':
        if (monitor) {
          monitor.disconnect();
        }
        monitor = new RealtimeAlertMonitor(supabase);
        await monitor.initialize();
        
        return new Response(JSON.stringify({
          status: 'restarted',
          version: '3.0.0-realtime-only',
          timestamp: new Date().toISOString(),
          message: 'Realtime alert monitor restarted successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'stop':
        if (monitor) {
          monitor.disconnect();
          monitor = null;
        }
        
        return new Response(JSON.stringify({
          status: 'stopped',
          timestamp: new Date().toISOString(),
          message: 'Realtime alert monitor stopped'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        return new Response(JSON.stringify({
          error: 'Invalid action',
          valid_actions: ['status', 'restart', 'stop']
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error) {
    console.error('❌ Error in realtime alert monitor:', error);
    
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})