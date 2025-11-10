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
    console.log('🎯 [TP1 Detector] Starting detection cycle...');

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
      console.error('❌ [TP1 Detector] Failed to fetch prices:', pricesError);
      throw pricesError;
    }

    console.log(`📊 [TP1 Detector] Fetched ${prices?.length || 0} prices`);

    // Get active signals that haven't hit TP1 yet
    const { data: signals, error: signalsError } = await supabase
      .from('trade_alerts')
      .select('*')
      .eq('status', 'active')
      .not('tp1', 'is', null)
      .or('tp_hits.is.null,not.tp_hits.cs.{1}'); // Not hit TP1 yet

    if (signalsError) {
      console.error('❌ [TP1 Detector] Failed to fetch signals:', signalsError);
      throw signalsError;
    }

    console.log(`🔍 [TP1 Detector] Monitoring ${signals?.length || 0} signals`);

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
      const tp1Hit = isBuy 
        ? currentPrice >= signal.tp1 
        : currentPrice <= signal.tp1;

      if (tp1Hit) {
        console.log(`🎯 [TP1 Detector] TP1 HIT! Signal ${signal.id} (${signal.asset_name})`);
        console.log(`   Entry: $${signal.entry_price}, TP1: $${signal.tp1}, Current: $${currentPrice}`);

        // Update signal to mark TP1 as hit
        const currentTpHits = signal.tp_hits || [];
        if (!currentTpHits.includes(1)) {
          const { error: updateError } = await supabase
            .from('trade_alerts')
            .update({ 
              tp_hits: [...currentTpHits, 1],
              updated_at: new Date().toISOString()
            })
            .eq('id', signal.id);

          if (updateError) {
            console.error(`❌ [TP1 Detector] Failed to update signal ${signal.id}:`, updateError);
          } else {
            console.log(`✅ [TP1 Detector] Updated signal ${signal.id} - TP1 marked as hit`);
            detectedCount++;
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      detector: 'tp1-detector',
      signals_monitored: signals?.length || 0,
      tp1_hits_detected: detectedCount,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ [TP1 Detector] Error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      detector: 'tp1-detector',
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

