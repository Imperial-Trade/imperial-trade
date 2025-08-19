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
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private connectionActive = false;
  private symbols = new Set<string>();
  private lastPriceUpdate: { [symbol: string]: number } = {};
  
  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async connect(): Promise<void> {
    try {
      console.log('🔌 Establishing persistent WebSocket connection to TraderMade...');
      
      const tradermadeKey = Deno.env.get('TRADERMADE_API_KEY');
      if (!tradermadeKey) {
        throw new Error('TRADERMADE_API_KEY not found');
      }

      const wsUrl = `wss://marketdata.tradermade.com/feedadv?api_key=${tradermadeKey}`;
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = async () => {
        console.log('✅ Connected to TraderMade WebSocket');
        this.connectionActive = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        
        // Subscribe to symbols with active alerts
        await this.refreshActiveSymbols();
      };

      this.ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📊 Raw TraderMade message:', JSON.stringify(data));
          
          if (data.symbol && data.mid) {
            const priceData: PriceData = {
              symbol: data.symbol,
              price: parseFloat(data.mid),
              bid: parseFloat(data.bid || data.mid),
              ask: parseFloat(data.ask || data.mid),
              timestamp: new Date().toISOString()
            };
            
            console.log(`💰 Processing price: ${priceData.symbol} = $${priceData.price}`);
            await this.processPriceTick(priceData);
          }
        } catch (error) {
          console.error('❌ Error processing price message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket connection closed');
        this.connectionActive = false;
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.connectionActive = false;
      };

    } catch (error) {
      console.error('❌ Failed to connect to TraderMade:', error);
      this.attemptReconnect();
    }
  }

  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('🚨 Max reconnection attempts reached. Giving up.');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private async refreshActiveSymbols(): Promise<void> {
    try {
      console.log('🔍 Refreshing active symbols...');
      
      const { data: activeSymbols, error } = await this.supabase
        .from('alert_monitoring')
        .select('symbol')
        .eq('is_active', true);

      if (error) {
        console.error('❌ Error fetching active symbols:', error);
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
          console.log(`📡 Subscribed to ${symbol}`);
        }
      }
      
      this.symbols = newSymbols;
      console.log(`📊 Monitoring ${this.symbols.size} symbols:`, Array.from(this.symbols));
      
    } catch (error) {
      console.error('❌ Error refreshing symbols:', error);
    }
  }

  private async processPriceTick(priceData: PriceData): Promise<void> {
    try {
      // Prevent duplicate processing of the same price
      if (this.lastPriceUpdate[priceData.symbol] === priceData.price) {
        return;
      }
      this.lastPriceUpdate[priceData.symbol] = priceData.price;

      console.log(`🎯 Processing alerts for ${priceData.symbol} at $${priceData.price}`);
      
      // Update market prices table
      const { error: upsertError } = await this.supabase
        .rpc('upsert_market_price', {
          p_symbol: priceData.symbol,
          p_bid: priceData.bid,
          p_ask: priceData.ask,
          p_mid: priceData.price,
          p_timestamp: priceData.timestamp
        });

      if (upsertError) {
        console.error('❌ Error updating market price:', upsertError);
      }

      // Process alerts using the enhanced function with BUY/SELL logic
      const { data: triggeredAlerts, error: alertError } = await this.supabase
        .rpc('process_price_alerts', {
          p_symbol: priceData.symbol,
          p_current_price: priceData.price
        });

      if (alertError) {
        console.error('❌ Error processing alerts:', alertError);
        return;
      }

      // Process triggered alerts
      if (triggeredAlerts && triggeredAlerts.length > 0) {
        const processedAlerts: ProcessedAlert[] = [];
        
        for (const alert of triggeredAlerts) {
          if (alert.triggered) {
            console.log(`🚨 ALERT TRIGGERED: ${alert.alert_type} for ${priceData.symbol} at $${priceData.price}`);
            console.log(`   Signal: ${alert.signal_id} | Direction: ${alert.trade_direction} | Target: $${alert.target_price}`);
            
            // Handle the triggered alert
            const { data: result, error: handleError } = await this.supabase
              .rpc('handle_triggered_alert', {
                p_alert_id: alert.alert_id,
                p_signal_id: alert.signal_id,
                p_alert_type: alert.alert_type,
                p_triggered_price: priceData.price
              });

            if (handleError) {
              console.error('❌ Error handling triggered alert:', handleError);
            } else if (result) {
              processedAlerts.push({
                alert_id: alert.alert_id,
                signal_id: alert.signal_id,
                alert_type: alert.alert_type,
                action: result.action,
                price: priceData.price,
                tp_level: result.tp_level,
                reason: result.reason
              });
              console.log(`✅ Alert processed: ${result.action}`, result);
            }
          }
        }

        // Broadcast notifications for triggered alerts
        if (processedAlerts.length > 0) {
          await this.broadcastAlertNotifications(processedAlerts, priceData);
        }
      }

    } catch (error) {
      console.error('❌ Error in processPriceTick:', error);
    }
  }

  private async broadcastAlertNotifications(alerts: ProcessedAlert[], priceData: PriceData): Promise<void> {
    try {
      console.log(`📢 Broadcasting ${alerts.length} alert notifications...`);
      
      // Notify via Supabase Realtime
      for (const alert of alerts) {
        const notification = {
          type: 'alert_triggered',
          signal_id: alert.signal_id,
          alert_type: alert.alert_type,
          action: alert.action,
          price: priceData.price,
          symbol: priceData.symbol,
          timestamp: priceData.timestamp,
          tp_level: alert.tp_level,
          reason: alert.reason
        };

        // Broadcast via Supabase Realtime channels
        const { error: realtimeError } = await this.supabase
          .channel('signal_alerts')
          .send({
            type: 'broadcast',
            event: 'alert_triggered',
            payload: notification
          });

        if (realtimeError) {
          console.error('❌ Error broadcasting realtime notification:', realtimeError);
        } else {
          console.log(`📡 Realtime notification sent for ${alert.alert_type}`);
        }
      }

      // Call notification dispatcher for push notifications
      const notificationPayload = {
        notifications: alerts.map(alert => ({
          signal_id: alert.signal_id,
          notification_type: alert.alert_type,
          asset_name: priceData.symbol,
          triggered_price: priceData.price,
          alert_type: alert.alert_type,
          action: alert.action,
          tp_level: alert.tp_level,
          delivery_channels: ['push', 'in_app', 'discord', 'telegram'],
          include_creator: false
        }))
      };

      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      const functionUrl = 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/signal-notification-dispatcher';
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
          'User-Agent': 'PersistentAlertMonitor/1.0'
        },
        body: JSON.stringify(notificationPayload)
      });

      if (response.ok) {
        console.log('📱 Push notifications dispatched successfully');
      } else {
        console.error('❌ Failed to dispatch push notifications:', await response.text());
      }

    } catch (error) {
      console.error('❌ Error broadcasting notifications:', error);
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
      console.log('🚀 Initializing persistent alert monitor...');
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
        console.log('🔄 Restarting alert monitor...');
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
        console.log('🛑 Stopping alert monitor...');
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
});