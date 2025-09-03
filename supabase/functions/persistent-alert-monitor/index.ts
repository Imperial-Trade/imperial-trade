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

// Direct WebSocket Alert Monitor - Optimized for low Realtime usage
class DirectWebSocketAlertMonitor {
  private supabase: any;
  private websocket: WebSocket | null = null;
  private processingActive = false;
  private reconnectTimeout: number | null = null;
  private isConnecting = false;
  
  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing Direct WebSocket Alert Monitor...');
    console.log('🔌 Connecting directly to enhanced-websocket-streaming service');
    
    await this.connectToEnhancedService();
  }

  private async connectToEnhancedService(): Promise<void> {
    if (this.isConnecting || this.websocket?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.isConnecting = true;
      const wsUrl = 'wss://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/enhanced-websocket-streaming';
      
      console.log('🔌 Connecting to enhanced WebSocket service...');
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('✅ Connected to enhanced WebSocket service');
        this.isConnecting = false;
        
        // Authenticate with the service
        this.websocket?.send(JSON.stringify({
          type: 'authenticate',
          token: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        }));
      };

      this.websocket.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'price_update' && !this.processingActive) {
            await this.handlePriceUpdate(data.payload);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      this.websocket.onclose = () => {
        console.log('🔌 WebSocket connection closed, scheduling reconnect...');
        this.isConnecting = false;
        this.websocket = null;
        
        // Reconnect after 5 seconds
        this.reconnectTimeout = setTimeout(() => {
          this.connectToEnhancedService();
        }, 5000);
      };

      this.websocket.onerror = (error) => {
        console.error('❌ WebSocket connection error:', error);
        this.isConnecting = false;
      };

    } catch (error) {
      console.error('❌ Failed to connect to enhanced service:', error);
      this.isConnecting = false;
      
      // Fallback to polling approach
      await this.startPollingMode();
    }
  }

  private async startPollingMode(): Promise<void> {
    console.log('🔄 Starting polling mode as fallback...');
    
    // Poll for alerts every 2 seconds using RPC
    setInterval(async () => {
      if (this.processingActive) return;
      
      try {
        // Get active symbols from alert monitoring
        const { data: activeAlerts } = await this.supabase
          .from('alert_monitoring')
          .select('symbol, target_price, alert_type')
          .eq('is_active', true);
          
        if (!activeAlerts || activeAlerts.length === 0) return;
        
        // Get unique symbols
        const symbols = [...new Set(activeAlerts.map((alert: any) => alert.symbol))];
        
        // Check current prices for these symbols
        for (const symbol of symbols) {
          const { data: priceData } = await this.supabase
            .from('market_prices')
            .select('*')
            .eq('symbol', symbol)
            .single();
            
          if (priceData) {
            await this.handlePriceUpdate({
              symbol: priceData.symbol,
              bid: priceData.bid,
              ask: priceData.ask,
              price: priceData.mid,
              timestamp: priceData.timestamp
            });
          }
        }
      } catch (error) {
        console.error('❌ Polling mode error:', error);
      }
    }, 2000);
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

  async healthCheck(): Promise<{ status: string; mode: string; connection: string }> {
    return {
      status: 'operational',
      mode: 'direct-websocket',
      connection: this.websocket?.readyState === WebSocket.OPEN ? 'active' : 'inactive'
    };
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }
}

// Global monitor instance
let monitor: DirectWebSocketAlertMonitor | null = null;

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
      monitor = new DirectWebSocketAlertMonitor(supabase);
      await monitor.initialize();
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'status';

    switch (action) {
      case 'status':
        const health = await monitor.healthCheck();
        return new Response(JSON.stringify({
          status: 'operational',
          version: '4.0.0-direct-websocket',
          monitor: health,
          timestamp: new Date().toISOString(),
          message: 'Direct WebSocket alert monitoring active - optimized for low Realtime usage'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'restart':
        if (monitor) {
          monitor.disconnect();
        }
        monitor = new DirectWebSocketAlertMonitor(supabase);
        await monitor.initialize();
        
        return new Response(JSON.stringify({
          status: 'restarted',
          version: '4.0.0-direct-websocket',
          timestamp: new Date().toISOString(),
          message: 'Direct WebSocket alert monitor restarted successfully'
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