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
    console.log('🎯 [TP2 Detector] Starting detection cycle...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: prices, error: pricesError } = await supabase
      .from('market_prices')
      .select('symbol, mid, bid, ask, updated_at')
      .not('mid', 'is', null);

    if (pricesError) throw pricesError;

    // Get active signals that hit TP1 but not TP2 yet
    const { data: signals, error: signalsError } = await supabase
      .from('trade_alerts')
      .select('*')
      .eq('status', 'active')
      .not('tp2', 'is', null)
      .contains('tp_hits', [1]) // Must have hit TP1
      .or('not.tp_hits.cs.{2}'); // But not TP2

    if (signalsError) throw signalsError;

    console.log(`🔍 [TP2 Detector] Monitoring ${signals?.length || 0} signals`);

    let detectedCount = 0;

    for (const signal of signals || []) {
      const priceData = prices?.find(p => 
        signal.tradermade_symbol?.toUpperCase() === p.symbol?.toUpperCase()
      );

      if (!priceData?.mid) continue;

      const currentPrice = priceData.mid;
      const isBuy = signal.trade_type === 'buy' || signal.trade_type === 'buy_limit';
      const tp2Hit = isBuy 
        ? currentPrice >= signal.tp2 
        : currentPrice <= signal.tp2;

      if (tp2Hit) {
        console.log(`🎯 [TP2 Detector] TP2 HIT! Signal ${signal.id} (${signal.asset_name})`);

        const currentTpHits = signal.tp_hits || [];
        if (!currentTpHits.includes(2)) {
          const { error: updateError } = await supabase
            .from('trade_alerts')
            .update({ 
              tp_hits: [...currentTpHits, 2],
              updated_at: new Date().toISOString()
            })
            .eq('id', signal.id);

          if (!updateError) {
            console.log(`✅ [TP2 Detector] Updated signal ${signal.id} - TP2 marked as hit`);
            detectedCount++;
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      detector: 'tp2-detector',
      signals_monitored: signals?.length || 0,
      tp2_hits_detected: detectedCount,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ [TP2 Detector] Error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      detector: 'tp2-detector',
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

