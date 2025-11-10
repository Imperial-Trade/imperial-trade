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
    console.log('🎯 [TP5 Detector] Starting detection cycle...');

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
      .not('tp5', 'is', null)
      .contains('tp_hits', [4]) // Must have hit TP4
      .or('not.tp_hits.cs.{5}'); // But not TP5

    if (signalsError) throw signalsError;

    console.log(`🔍 [TP5 Detector] Monitoring ${signals?.length || 0} signals`);

    let detectedCount = 0;

    for (const signal of signals || []) {
      const priceData = prices?.find(p => 
        signal.tradermade_symbol?.toUpperCase() === p.symbol?.toUpperCase()
      );

      if (!priceData?.mid) continue;

      const currentPrice = priceData.mid;
      const isBuy = signal.trade_type === 'buy' || signal.trade_type === 'buy_limit';
      const tp5Hit = isBuy 
        ? currentPrice >= signal.tp5 
        : currentPrice <= signal.tp5;

      if (tp5Hit) {
        console.log(`🎯 [TP5 Detector] TP5 HIT! Signal ${signal.id} (${signal.asset_name})`);

        const currentTpHits = signal.tp_hits || [];
        if (!currentTpHits.includes(5)) {
          // Check if this is the final TP (all TPs hit)
          const allTpsHit = signal.tp1 && signal.tp2 && signal.tp3 && signal.tp4 && signal.tp5;
          
          const { error: updateError } = await supabase
            .from('trade_alerts')
            .update({ 
              tp_hits: [...currentTpHits, 5],
              close_reason: allTpsHit ? 'all_tps_hit' : null,
              status: allTpsHit ? 'closed' : 'active',
              updated_at: new Date().toISOString()
            })
            .eq('id', signal.id);

          if (!updateError) {
            console.log(`✅ [TP5 Detector] Updated signal ${signal.id} - TP5 marked as hit${allTpsHit ? ' (ALL TPs HIT!)' : ''}`);
            detectedCount++;
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      detector: 'tp5-detector',
      signals_monitored: signals?.length || 0,
      tp5_hits_detected: detectedCount,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ [TP5 Detector] Error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      detector: 'tp5-detector',
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

