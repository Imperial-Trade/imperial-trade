import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('⏳ [Limit Activation Detector] Starting detection cycle...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get current market prices
    const { data: prices, error: pricesError } = await supabase
      .from('market_prices')
      .select('symbol, mid, bid, ask, updated_at')
      .not('mid', 'is', null);

    if (pricesError) {
      console.error('❌ [Limit Activation Detector] Failed to fetch prices:', pricesError);
      throw pricesError;
    }

    console.log(`📊 [Limit Activation Detector] Fetched ${prices?.length || 0} prices`);

    // Get pending limit orders (BUY LIMIT / SELL LIMIT)
    const { data: signals, error: signalsError } = await supabase
      .from('trade_alerts')
      .select('*')
      .eq('status', 'pending')
      .in('trade_type', ['buy_limit', 'sell_limit']);

    if (signalsError) {
      console.error('❌ [Limit Activation Detector] Failed to fetch signals:', signalsError);
      throw signalsError;
    }

    console.log(`🔍 [Limit Activation Detector] Monitoring ${signals?.length || 0} pending limits`);

    let detectedCount = 0;

    // Check each limit order against current prices
    for (const signal of signals || []) {
      // Find matching price for this signal's asset
      const priceData = prices?.find(p => {
        const normalizedSymbol = signal.tradermade_symbol?.toUpperCase();
        const normalizedPrice = p.symbol?.toUpperCase();
        return normalizedSymbol === normalizedPrice;
      });

      if (!priceData || !priceData.mid) {
        continue; // Skip if no price data
      }

      const currentPrice = priceData.mid;
      const entryPrice = signal.entry_price;
      
      // BUY LIMIT: Activates when price goes DOWN to entry_price or below
      // SELL LIMIT: Activates when price goes UP to entry_price or above
      const limitActivated = signal.trade_type === 'buy_limit'
        ? currentPrice <= entryPrice
        : currentPrice >= entryPrice;

      if (limitActivated) {
        console.log(`⏳ [Limit Activation Detector] LIMIT ACTIVATED! Signal ${signal.id} (${signal.asset_name})`);
        console.log(`   Type: ${signal.trade_type}, Entry: $${entryPrice}, Current: $${currentPrice}`);

        // Update signal status from pending to active
        const { error: updateError } = await supabase
          .from('trade_alerts')
          .update({ 
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', signal.id);

        if (updateError) {
          console.error(`❌ [Limit Activation Detector] Failed to update signal ${signal.id}:`, updateError);
        } else {
          console.log(`✅ [Limit Activation Detector] Signal ${signal.id} activated`);
          detectedCount++;
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      detector: 'limit-activation-detector',
      signals_monitored: signals?.length || 0,
      limits_activated: detectedCount,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ [Limit Activation Detector] Error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      detector: 'limit-activation-detector',
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

