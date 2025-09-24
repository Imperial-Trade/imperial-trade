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
        id, tradermade_symbol, entry_price, trade_type, asset_name, user_id,
        market_prices!inner(symbol, bid, ask, mid)
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

    let triggered = 0;
    let processed = 0;

    if (pendingLimits && pendingLimits.length > 0) {
      for (const alert of pendingLimits) {
        processed++;
        const marketPrice = alert.market_prices;
        
        if (!marketPrice) continue;

        const shouldTrigger = 
          (alert.trade_type === 'buy_limit' && marketPrice.ask <= alert.entry_price) ||
          (alert.trade_type === 'sell_limit' && marketPrice.bid >= alert.entry_price);

        if (shouldTrigger) {
          // Activate the order
          const { error: updateError } = await supabase
            .from('trade_alerts')
            .update({
              status: 'active',
              activated_at: new Date().toISOString(),
              activation_price: alert.entry_price,
              updated_at: new Date().toISOString()
            })
            .eq('id', alert.id);

          if (updateError) {
            console.error(`❌ Failed to activate order ${alert.id}:`, updateError);
          } else {
            console.log(`✅ Activated ${alert.trade_type} order for ${alert.asset_name} at ${alert.entry_price}`);
            triggered++;
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