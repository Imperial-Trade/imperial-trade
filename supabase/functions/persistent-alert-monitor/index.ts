import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'
import { corsHeaders } from '../_shared/cors.ts'

// Types for real-time processing
interface PriceData {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  timestamp: string;
}

interface AlertTrigger {
  alert_id: string;
  signal_id: string;
  alert_type: string;
  target_price: number;
  triggered: boolean;
  trade_direction: string;
  signal_status: string;
}

interface ProcessedAlert {
  alert_id: string;
  signal_id: string;
  alert_type: string;
  action: string;
  price: number;
  tp_level?: number;
  reason?: string;
}

// Persistent WebSocket connection to TraderMade
class TraderMadeStreamer {
  private ws: WebSocket | null = null;
  private supabase: any;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 2000; // Start with 2 seconds
  private connectionActive = false;
  private symbols = new Set<string>();
  private lastPriceUpdate: { [symbol: string]: number } = {};
  private processingBatch = false;
  
  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async connect(): Promise<void> {
    try {
      const tradermadeKey = Deno.env.get('TRADERMADE_API_KEY');
      if (!tradermadeKey) {
        console.error('❌ TRADERMADE_API_KEY not found');
        return;
      }

      const wsUrl = `wss://marketdata.tradermade.com/feedadv?api_key=${tradermadeKey}`;
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = async () => {
        this.connectionActive = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 2000;
        
        await this.refreshActiveSymbols();
      };

      this.ws.onmessage = async (event) => {
        try {
          // Handle text messages like "Connected" without trying to parse as JSON
          if (typeof event.data === 'string' && !event.data.startsWith('{')) {
            if (event.data.toLowerCase().includes('connected')) {
              console.log('✅ TraderMade connection confirmed');
            }
            return;
          }
          
          const data = JSON.parse(event.data);
          
          if (data.symbol && data.mid) {
            const priceData: PriceData = {
              symbol: data.symbol,
              price: parseFloat(data.mid),
              bid: parseFloat(data.bid || data.mid),
              ask: parseFloat(data.ask || data.mid),
              timestamp: new Date().toISOString()
            };
            
            // Process with reduced logging and batching
            await this.processPriceTick(priceData);
          }
        } catch (error) {
          // Only log parsing errors for actual JSON messages
          if (event.data.startsWith('{')) {
            console.error('❌ JSON parsing error:', error);
          }
        }
      };

      this.ws.onclose = () => {
        this.connectionActive = false;
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        this.connectionActive = false;
      };

    } catch (error) {
      console.error('❌ Connection failed:', error);
      this.attemptReconnect();
    }
  }

  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('🚨 Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), 30000);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private async refreshActiveSymbols(): Promise<void> {
    try {
      const { data: activeSymbols, error } = await this.supabase
        .from('alert_monitoring')
        .select('symbol')
        .eq('is_active', true);

      if (error) {
        console.error('❌ Error fetching symbols:', error);
        return;
      }

      const newSymbols = new Set(activeSymbols?.map((s: any) => s.symbol) || []);
      
      // Subscribe to new symbols
      for (const symbol of newSymbols) {
        if (!this.symbols.has(symbol) && this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            userKey: Deno.env.get('TRADERMADE_API_KEY'),
            symbol: symbol
          }));
        }
      }
      
      this.symbols = newSymbols;
      
    } catch (error) {
      console.error('❌ Error refreshing symbols:', error);
    }
  }

  private async processPriceTick(priceData: PriceData): Promise<void> {
    try {
      // Prevent duplicate processing and reduce overhead
      if (this.lastPriceUpdate[priceData.symbol] === priceData.price || this.processingBatch) {
        return;
      }
      
      this.processingBatch = true;
      this.lastPriceUpdate[priceData.symbol] = priceData.price;

      // Update market prices efficiently with enhanced function
      const { error: upsertError } = await this.supabase
        .rpc('upsert_market_price_enhanced', {
          p_symbol: priceData.symbol,
          p_bid: priceData.bid,
          p_ask: priceData.ask,
          p_mid: priceData.price,
          p_timestamp: priceData.timestamp
        });

      if (upsertError) {
        console.error('❌ Market price update error:', upsertError.message);
      }

      // Process alerts efficiently with enhanced bid/ask precision
      const { data: triggeredAlerts, error: alertError } = await this.supabase
        .rpc('process_price_alerts_enhanced', {
          p_symbol: priceData.symbol,
          p_current_bid: priceData.bid,
          p_current_ask: priceData.ask
        });

      if (alertError) {
        console.error('❌ Alert processing error:', alertError.message);
        this.processingBatch = false;
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

        // Batch notifications
        if (processedAlerts.length > 0) {
          await this.broadcastAlertNotifications(processedAlerts, priceData);
        }
      }

      this.processingBatch = false;

    } catch (error) {
      console.error('❌ Processing error:', error);
      this.processingBatch = false;
    }
  }

  private async broadcastAlertNotifications(alerts: ProcessedAlert[], priceData: PriceData): Promise<void> {
    try {
      // Optimized notification broadcasting
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

  async healthCheck(): Promise<{ status: string; symbols: number; connected: boolean }> {
    return {
      status: this.connectionActive ? 'healthy' : 'disconnected',
      symbols: this.symbols.size,
      connected: this.connectionActive
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connectionActive = false;
  }
}

// Global streamer instance for persistent connection
let streamer: TraderMadeStreamer | null = null;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = 'https://kmuoqkcxguafxulqlbmi.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not found');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize streamer if not already running
    if (!streamer) {
      streamer = new TraderMadeStreamer(supabase);
      await streamer.connect();
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'status';

    switch (action) {
      case 'status':
        const health = await streamer.healthCheck();
        return new Response(JSON.stringify({
          status: 'operational',
          monitor: health,
          timestamp: new Date().toISOString(),
          message: 'Persistent alert monitoring active'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'restart':
        if (streamer) {
          streamer.disconnect();
        }
        streamer = new TraderMadeStreamer(supabase);
        await streamer.connect();
        
        return new Response(JSON.stringify({
          status: 'restarted',
          timestamp: new Date().toISOString(),
          message: 'Alert monitor restarted successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'stop':
        if (streamer) {
          streamer.disconnect();
          streamer = null;
        }
        
        return new Response(JSON.stringify({
          status: 'stopped',
          timestamp: new Date().toISOString(),
          message: 'Alert monitor stopped'
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
    console.error('❌ Error in persistent alert monitor:', error);
    
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