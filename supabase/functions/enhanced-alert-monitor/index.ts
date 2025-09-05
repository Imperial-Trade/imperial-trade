
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PriceData {
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  timestamp: string;
}

interface EnhancedAlertResult {
  alert_id: string;
  signal_id: string;
  alert_type: string;
  target_price: number;
  triggered: boolean;
  priority_order: number;
  trade_direction: string;
  trigger_price: number;
}

interface AlertHandlingResult {
  action: string;
  reason?: string;
  tp_level?: number;
  total_tps_hit?: number;
  remaining_tps?: number;
  triggered_price: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🚀 Enhanced Alert Monitor - Starting institutional-grade monitoring via enhanced-websocket-streaming...');

    // Step 1: Get all active symbols from alert_monitoring
    const { data: activeSymbols, error: symbolsError } = await supabase
      .from('alert_monitoring')
      .select('symbol')
      .eq('is_active', true);

    if (symbolsError) {
      throw symbolsError;
    }

    if (!activeSymbols || activeSymbols.length === 0) {
      console.log('ℹ️ No active alerts to monitor');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No active alerts to process',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const uniqueSymbols = [...new Set(activeSymbols.map(a => a.symbol))];
    console.log(`📊 Monitoring ${uniqueSymbols.length} symbols:`, uniqueSymbols);

    // Step 2: Get current prices from market_prices table (populated by enhanced-websocket-streaming)
    const { data: marketPrices, error: pricesError } = await supabase
      .from('market_prices')
      .select('symbol, bid, ask, mid, timestamp')
      .in('symbol', uniqueSymbols);

    if (pricesError) {
      console.error('❌ Error fetching market prices:', pricesError);
      throw pricesError;
    }

    // If no prices available, skip processing
    if (!marketPrices || marketPrices.length === 0) {
      console.log('⚡ No market prices available, skipping alert processing...');
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No current market prices available',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validPrices = marketPrices.map(p => ({
      symbol: p.symbol,
      bid: p.bid,
      ask: p.ask,
      mid: p.mid,
      timestamp: p.timestamp
    }));

    console.log(`📈 Successfully fetched ${validPrices.length} price updates`);

    let totalTriggered = 0;
    const processedAlerts: any[] = [];

    // Step 3: Process each symbol with enhanced bid/ask precision
    for (const priceData of validPrices) {
      try {
        // SKIP REDUNDANT PRICE UPDATES: enhanced-websocket-streaming handles this
        console.log(`📈 Processing alerts for ${priceData.symbol} (price: ${priceData.mid})`);
        
        // No database price update needed - data is already fresh from enhanced-websocket-streaming

        // Process alerts using enhanced function with SL priority
        const { data: triggeredAlerts, error: alertError } = await supabase
          .rpc('process_price_alerts_enhanced', {
            p_symbol: priceData.symbol,
            p_current_bid: priceData.bid,
            p_current_ask: priceData.ask
          });

        if (alertError) {
          console.error(`❌ Error processing alerts for ${priceData.symbol}:`, alertError);
          continue;
        }

        if (!triggeredAlerts || triggeredAlerts.length === 0) {
          continue;
        }

        // Handle triggered alerts with proper prioritization
        const alertsToProcess = (triggeredAlerts as EnhancedAlertResult[])
          .filter(alert => alert.triggered)
          .sort((a, b) => a.priority_order - b.priority_order); // SL first (priority 1), then TP (priority 2)

        console.log(`🎯 Processing ${alertsToProcess.length} triggered alerts for ${priceData.symbol}`);

        for (const alert of alertsToProcess) {
          try {
            // Handle the triggered alert using enhanced logic
            const { data: result, error: handleError } = await supabase
              .rpc('handle_triggered_alert_enhanced', {
                p_alert_id: alert.alert_id,
                p_signal_id: alert.signal_id,
                p_alert_type: alert.alert_type,
                p_triggered_price: alert.trigger_price
              });

            if (handleError) {
              console.error(`❌ Error handling alert ${alert.alert_id}:`, handleError);
              continue;
            }

            const alertResult = result as AlertHandlingResult;
            totalTriggered++;

            console.log(`✅ Alert processed: ${alert.alert_type} for ${priceData.symbol} - ${alertResult.action}`);

            processedAlerts.push({
              symbol: priceData.symbol,
              alert_id: alert.alert_id,
              signal_id: alert.signal_id,
              alert_type: alert.alert_type,
              trigger_price: alert.trigger_price,
              action: alertResult.action,
              reason: alertResult.reason,
              tp_level: alertResult.tp_level,
              total_tps_hit: alertResult.total_tps_hit,
              remaining_tps: alertResult.remaining_tps
            });

            // Send real-time notification for critical actions
            if (alertResult.action === 'signal_closed' || alertResult.action === 'tp_partial_hit') {
              try {
                const notificationPayload = {
                  notifications: [{
                    signal_id: alert.signal_id,
                    notification_type: alert.alert_type,
                    asset_name: priceData.symbol,
                    triggered_price: alert.trigger_price,
                    alert_type: alert.alert_type,
                    action: alertResult.action,
                    tp_level: alertResult.tp_level,
                    delivery_channels: ['push', 'in_app'],
                    include_creator: false
                  }]
                };

                const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
                const functionUrl = 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/signal-notification-dispatcher';
                
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

              } catch (notificationError) {
                console.error('❌ Notification error:', notificationError);
              }
            }

          } catch (error) {
            console.error(`❌ Error processing alert ${alert.alert_id}:`, error);
          }
        }

      } catch (error) {
        console.error(`❌ Error processing symbol ${priceData.symbol}:`, error);
      }
    }

    const summary = {
      success: true,
      processed_symbols: validPrices.length,
      total_alerts_triggered: totalTriggered,
      processed_alerts: processedAlerts,
      monitoring_mode: 'enhanced_institutional',
      features: [
        'SL_priority_over_TP',
        'partial_profit_tracking', 
        'bid_ask_precision',
        'atomic_signal_closure',
        'real_time_notifications'
      ],
      timestamp: new Date().toISOString()
    };

    console.log('🎉 Enhanced monitoring completed:', summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Fatal error in enhanced alert monitor:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Enhanced monitoring failed', 
      details: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
