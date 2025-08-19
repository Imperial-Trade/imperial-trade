import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertMonitoring {
  id: string;
  signal_id: string;
  symbol: string;
  alert_type: string;
  target_price: number;
  current_price?: number;
  is_active: boolean;
  priority_level: number;
  created_at: string;
  updated_at: string;
}

interface MarketPrice {
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  timestamp: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Starting persistent alert monitoring cycle...');
    
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active alert monitoring entries
    const { data: alerts, error: alertsError } = await supabase
      .from('alert_monitoring')
      .select('*')
      .eq('is_active', true)
      .order('priority_level', { ascending: false });

    if (alertsError) {
      console.error('❌ Failed to fetch alert monitoring data:', alertsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch alerts' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!alerts || alerts.length === 0) {
      console.log('ℹ️ No active alerts to monitor');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No active alerts',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📊 Monitoring ${alerts.length} active alerts`);

    // Group alerts by symbol for efficient price fetching
    const symbolMap = new Map<string, AlertMonitoring[]>();
    alerts.forEach((alert: AlertMonitoring) => {
      if (!symbolMap.has(alert.symbol)) {
        symbolMap.set(alert.symbol, []);
      }
      symbolMap.get(alert.symbol)!.push(alert);
    });

    let processedCount = 0;
    let triggeredCount = 0;

    // Process each symbol
    for (const [symbol, symbolAlerts] of symbolMap) {
      console.log(`💰 Processing ${symbolAlerts.length} alerts for ${symbol}`);
      
      // Get current market price
      const { data: priceData, error: priceError } = await supabase
        .from('market_prices')
        .select('*')
        .eq('symbol', symbol)
        .single();

      if (priceError || !priceData) {
        console.warn(`⚠️ No market price data for ${symbol}, skipping alerts`);
        continue;
      }

      const currentPrice = priceData.mid;
      console.log(`📈 Current ${symbol} price: ${currentPrice}`);

      // Check each alert for this symbol
      for (const alert of symbolAlerts) {
        try {
          // Update current price in alert monitoring
          const { error: updateError } = await supabase
            .from('alert_monitoring')
            .update({
              current_price: currentPrice,
              last_checked_at: new Date().toISOString()
            })
            .eq('id', alert.id);

          if (updateError) {
            console.error(`❌ Failed to update current price for alert ${alert.id}:`, updateError);
            continue;
          }

          // Get the trade alert to determine trade type
          const { data: tradeAlert, error: tradeError } = await supabase
            .from('trade_alerts')
            .select('trade_type, status')
            .eq('id', alert.signal_id)
            .single();

          if (tradeError || !tradeAlert || tradeAlert.status !== 'active') {
            console.warn(`⚠️ Trade alert ${alert.signal_id} not found or not active, deactivating monitoring`);
            
            // Deactivate this monitoring entry
            await supabase
              .from('alert_monitoring')
              .update({ is_active: false })
              .eq('id', alert.id);
            
            continue;
          }

          // Check if alert should trigger
          let shouldTrigger = false;
          const tradeType = tradeAlert.trade_type;
          const buffer = currentPrice * 0.0001; // 0.01% buffer to prevent false triggers

          if (alert.alert_type === 'stop_loss') {
            if (tradeType === 'buy' || tradeType === 'buy_limit') {
              shouldTrigger = currentPrice <= (alert.target_price - buffer);
            } else {
              shouldTrigger = currentPrice >= (alert.target_price + buffer);
            }
          } else if (alert.alert_type.startsWith('take_profit_')) {
            if (tradeType === 'buy' || tradeType === 'buy_limit') {
              shouldTrigger = currentPrice >= (alert.target_price + buffer);
            } else {
              shouldTrigger = currentPrice <= (alert.target_price - buffer);
            }
          }

          if (shouldTrigger) {
            console.log(`🚨 ALERT TRIGGERED! ${alert.alert_type} for ${symbol} at price ${currentPrice} (target: ${alert.target_price})`);
            
            // Use the system function to update the trade alert
            if (alert.alert_type === 'stop_loss') {
              const { error: updateError } = await supabase.rpc('system_update_trade_alert', {
                p_signal_id: alert.signal_id,
                p_status: 'closed',
                p_close_reason: 'stop_loss'
              });

              if (updateError) {
                console.error(`❌ Failed to close trade alert ${alert.signal_id}:`, updateError);
              } else {
                console.log(`✅ Trade alert ${alert.signal_id} closed due to stop loss`);
              }
            } else if (alert.alert_type.startsWith('take_profit_')) {
              // Extract TP number
              const tpMatch = alert.alert_type.match(/take_profit_(\d+)/);
              if (tpMatch) {
                const tpNumber = parseInt(tpMatch[1]);
                
                // Get current TP hits
                const { data: currentAlert } = await supabase
                  .from('trade_alerts')
                  .select('tp_hits')
                  .eq('id', alert.signal_id)
                  .single();

                const currentHits = currentAlert?.tp_hits || [];
                if (!currentHits.includes(tpNumber)) {
                  const newHits = [...currentHits, tpNumber].sort();
                  
                  const { error: updateError } = await supabase.rpc('system_update_trade_alert', {
                    p_signal_id: alert.signal_id,
                    p_tp_hits: newHits
                  });

                  if (updateError) {
                    console.error(`❌ Failed to update TP hits for ${alert.signal_id}:`, updateError);
                  } else {
                    console.log(`✅ TP${tpNumber} hit recorded for trade alert ${alert.signal_id}`);
                  }
                }
              }
            }

            // Deactivate this specific alert
            await supabase
              .from('alert_monitoring')
              .update({ is_active: false })
              .eq('id', alert.id);

            triggeredCount++;
          }

          processedCount++;

        } catch (error) {
          console.error(`❌ Error processing alert ${alert.id}:`, error);
        }
      }
    }

    console.log(`✅ Alert monitoring cycle completed: ${processedCount} processed, ${triggeredCount} triggered`);

    return new Response(JSON.stringify({
      success: true,
      processed: processedCount,
      triggered: triggeredCount,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Alert monitoring error:', error);
    
    return new Response(JSON.stringify({
      error: 'Alert monitoring failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});