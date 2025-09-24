import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('🚀 Starting order trigger monitor...');

    // Check for limit orders that should be activated
    const { data: pendingLimits, error: fetchError } = await supabase
      .from('trade_alerts')
      .select(`
        id, tradermade_symbol, entry_price, trade_type, asset_name, user_id
      `)
      .eq('status', 'pending')
      .in('trade_type', ['buy_limit', 'sell_limit']);

    if (fetchError) {
      console.error('❌ Error fetching pending limits:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending limits' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`📊 Found ${pendingLimits?.length || 0} pending limit orders`);

    // Get market prices separately
    const symbols = [...new Set(pendingLimits?.map(alert => alert.tradermade_symbol) || [])];
    const { data: marketPrices, error: priceError } = await supabase
      .from('market_prices')
      .select('symbol, mid')
      .in('symbol', symbols);

    if (priceError) {
      console.error('❌ Error fetching market prices:', priceError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch market prices' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Create price lookup map
    const priceMap = new Map(marketPrices?.map(p => [p.symbol, p.mid]) || []);

    let triggered = 0;
    let processed = 0;

    if (pendingLimits && pendingLimits.length > 0) {
      for (const alert of pendingLimits) {
        processed++;
        const currentPrice = priceMap.get(alert.tradermade_symbol);
        
        if (!currentPrice) {
          console.log(`⚠️ No price data for ${alert.tradermade_symbol}`);
          continue;
        }

        // Fixed trigger logic using mid price
        const shouldTrigger = 
          (alert.trade_type === 'buy_limit' && currentPrice <= alert.entry_price) ||
          (alert.trade_type === 'sell_limit' && currentPrice >= alert.entry_price);

        console.log(`🔍 Checking ${alert.asset_name} (${alert.trade_type}): price=${currentPrice}, entry=${alert.entry_price}, shouldTrigger=${shouldTrigger}`);

        if (shouldTrigger) {
          // Activate the order
          const { error: updateError } = await supabase
            .from('trade_alerts')
            .update({
              status: 'active',
              activated_at: new Date().toISOString(),
              activation_price: currentPrice, // Use actual trigger price
              updated_at: new Date().toISOString()
            })
            .eq('id', alert.id);

          if (updateError) {
            console.error(`❌ Failed to activate order ${alert.id}:`, updateError);
          } else {
            console.log(`✅ Activated ${alert.trade_type} order for ${alert.asset_name} at ${currentPrice} (entry: ${alert.entry_price})`);
            triggered++;

            // Send order activated notification
            try {
              const { error: notifyError } = await supabase.functions.invoke('enhanced-signal-notification-dispatcher', {
                body: {
                  notifications: [{
                    signal_id: alert.id,
                    user_id: alert.user_id,
                    asset_name: alert.asset_name,
                    trade_type: alert.trade_type,
                    entry_price: alert.entry_price,
                    activation_price: currentPrice,
                    notification_type: 'limit_order_activated',
                    alert_type: 'limit_order_activated',
                    status: 'active',
                    change_types: ['limit_order_activated'],
                    priority_level: 2,
                    delivery_channels: ['push', 'in_app']
                  }]
                }
              });

              if (notifyError) {
                console.error(`⚠️ Failed to send activation notification for ${alert.id}:`, notifyError);
              } else {
                console.log(`📡 Sent activation notification for ${alert.asset_name}`);
              }
            } catch (notifyException) {
              console.error(`❌ Exception sending activation notification:`, notifyException);
            }
          }
        }
      }
    }

    console.log(`✅ Order monitor completed: ${processed} processed, ${triggered} triggered`);

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        triggered,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Fatal error in order monitor:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});