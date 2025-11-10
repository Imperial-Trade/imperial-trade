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
    console.log('🛑 [Stop Loss Detector] Starting detection cycle...');

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
      console.error('❌ [Stop Loss Detector] Failed to fetch prices:', pricesError);
      throw pricesError;
    }

    console.log(`📊 [Stop Loss Detector] Fetched ${prices?.length || 0} prices`);

    // Get active signals with stop loss not yet hit
    const { data: signals, error: signalsError } = await supabase
      .from('trade_alerts')
      .select('*')
      .eq('status', 'active')
      .not('stop_loss', 'is', null)
      .neq('close_reason', 'stop_loss'); // Not already closed by SL

    if (signalsError) {
      console.error('❌ [Stop Loss Detector] Failed to fetch signals:', signalsError);
      throw signalsError;
    }

    console.log(`🔍 [Stop Loss Detector] Monitoring ${signals?.length || 0} signals`);

    let detectedCount = 0;

    // Check each signal against current prices
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
      const isBuy = signal.trade_type === 'buy' || signal.trade_type === 'buy_limit';
      
      // For BUY: SL is hit when price goes BELOW stop_loss
      // For SELL: SL is hit when price goes ABOVE stop_loss
      const slHit = isBuy 
        ? currentPrice <= signal.stop_loss 
        : currentPrice >= signal.stop_loss;

      if (slHit) {
        console.log(`🛑 [Stop Loss Detector] STOP LOSS HIT! Signal ${signal.id} (${signal.asset_name})`);
        console.log(`   Entry: $${signal.entry_price}, SL: $${signal.stop_loss}, Current: $${currentPrice}`);

        // Update signal to mark as closed due to stop loss
        const { error: updateError } = await supabase
          .from('trade_alerts')
          .update({ 
            close_reason: 'stop_loss',
            status: 'closed',
            updated_at: new Date().toISOString()
          })
          .eq('id', signal.id);

        if (updateError) {
          console.error(`❌ [Stop Loss Detector] Failed to update signal ${signal.id}:`, updateError);
        } else {
          console.log(`✅ [Stop Loss Detector] Signal ${signal.id} closed due to stop loss`);
          detectedCount++;
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      detector: 'stop-loss-detector',
      signals_monitored: signals?.length || 0,
      stop_losses_detected: detectedCount,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ [Stop Loss Detector] Error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      detector: 'stop-loss-detector',
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

