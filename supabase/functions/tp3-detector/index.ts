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
    console.log('🎯 [TP3 Detector] Starting detection cycle...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: prices, error: pricesError } = await supabase
      .from('market_prices')
      .select('symbol, mid, bid, ask, updated_at')
      .not('mid', 'is', null);

    if (pricesError) throw pricesError;

    const { data: signals, error: signalsError } = await supabase
      .from('trade_alerts')
      .select('*')
      .eq('status', 'active')
      .not('tp3', 'is', null)
      .contains('tp_hits', [2]) // Must have hit TP2
      .or('not.tp_hits.cs.{3}'); // But not TP3

    if (signalsError) throw signalsError;

    console.log(`🔍 [TP3 Detector] Monitoring ${signals?.length || 0} signals`);

    let detectedCount = 0;

    for (const signal of signals || []) {
      const priceData = prices?.find(p => 
        signal.tradermade_symbol?.toUpperCase() === p.symbol?.toUpperCase()
      );

      if (!priceData?.mid) continue;

      const currentPrice = priceData.mid;
      const isBuy = signal.trade_type === 'buy' || signal.trade_type === 'buy_limit';
      const tp3Hit = isBuy 
        ? currentPrice >= signal.tp3 
        : currentPrice <= signal.tp3;

      if (tp3Hit) {
        console.log(`🎯 [TP3 Detector] TP3 HIT! Signal ${signal.id} (${signal.asset_name})`);

        const currentTpHits = signal.tp_hits || [];
        if (!currentTpHits.includes(3)) {
          const { error: updateError } = await supabase
            .from('trade_alerts')
            .update({ 
              tp_hits: [...currentTpHits, 3],
              updated_at: new Date().toISOString()
            })
            .eq('id', signal.id);

          if (!updateError) {
            console.log(`✅ [TP3 Detector] Updated signal ${signal.id} - TP3 marked as hit`);
            detectedCount++;
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      detector: 'tp3-detector',
      signals_monitored: signals?.length || 0,
      tp3_hits_detected: detectedCount,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ [TP3 Detector] Error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      detector: 'tp3-detector',
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

