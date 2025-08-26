
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://kmuoqkcxguafxulqlbmi.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔍 Running comprehensive signal engine diagnostic...');

    // Query problematic signals directly using the client
    const { data: problemSignals, error: problemError } = await supabase
      .from('trade_alerts')
      .select(`
        id,
        asset_name,
        tradermade_symbol,
        status,
        tp1, tp2, tp3, tp4, tp5,
        tp_hits,
        trade_type,
        entry_price
      `)
      .in('status', ['active', 'partially_profited']);

    if (problemError) {
      console.error('❌ Problem signals query failed:', problemError);
      throw problemError;
    }

    // Query pending orders that might be ready to activate
    const { data: pendingOrders, error: pendingError } = await supabase
      .from('trade_alerts')
      .select(`
        id,
        asset_name,
        trade_type,
        entry_price,
        tradermade_symbol
      `)
      .eq('status', 'pending')
      .in('trade_type', ['buy_limit', 'sell_limit']);

    if (pendingError) {
      console.error('❌ Pending orders query failed:', pendingError);
      throw pendingError;
    }

    // Get current market prices for comparison
    const symbols = [...new Set([
      ...(problemSignals || []).map(s => s.tradermade_symbol),
      ...(pendingOrders || []).map(s => s.tradermade_symbol)
    ])];

    const { data: marketPrices, error: pricesError } = await supabase
      .from('market_prices')
      .select('symbol, bid, ask')
      .in('symbol', symbols);

    if (pricesError) {
      console.warn('⚠️ Market prices query failed:', pricesError);
    }

    // Process the data to find issues
    const priceMap = new Map();
    (marketPrices || []).forEach(price => {
      priceMap.set(price.symbol, price);
    });

    // Find signals with all TPs hit but not closed
    const problemAllTpsHit = (problemSignals || []).filter(signal => {
      const totalTPs = [signal.tp1, signal.tp2, signal.tp3, signal.tp4, signal.tp5]
        .filter(tp => tp !== null).length;
      const tpHits = signal.tp_hits || [];
      return totalTPs > 0 && tpHits.length >= totalTPs && signal.status !== 'closed';
    });

    // Find single TP signals that should be closed
    const problemSingleTpNotClosed = (problemSignals || []).filter(signal => {
      const totalTPs = [signal.tp1, signal.tp2, signal.tp3, signal.tp4, signal.tp5]
        .filter(tp => tp !== null).length;
      const tpHits = signal.tp_hits || [];
      return totalTPs === 1 && tpHits.includes(1) && signal.status !== 'closed';
    });

    // Find pending orders ready to activate
    const pendingReadyToActivate = (pendingOrders || []).filter(order => {
      const marketPrice = priceMap.get(order.tradermade_symbol);
      if (!marketPrice) return false;
      
      return (
        (order.trade_type === 'buy_limit' && marketPrice.bid <= order.entry_price) ||
        (order.trade_type === 'sell_limit' && marketPrice.ask >= order.entry_price)
      );
    });

    // Check monitoring status
    const { data: monitoringData, error: monitoringError } = await supabase
      .from('alert_monitoring')
      .select(`
        signal_id,
        is_active,
        trade_alerts!inner(asset_name, status)
      `)
      .eq('is_active', true);

    const monitoringInactive = [];
    if (!monitoringError) {
      // Group by signal_id and check for inactive monitoring
      const signalMonitoring = new Map();
      (monitoringData || []).forEach(monitor => {
        if (!signalMonitoring.has(monitor.signal_id)) {
          signalMonitoring.set(monitor.signal_id, {
            signal_id: monitor.signal_id,
            asset: monitor.trade_alerts?.asset_name || 'Unknown',
            status: monitor.trade_alerts?.status || 'Unknown',
            total_monitors: 0,
            active_monitors: 0
          });
        }
        const entry = signalMonitoring.get(monitor.signal_id);
        entry.total_monitors++;
        if (monitor.is_active) entry.active_monitors++;
      });

      // Find signals with no active monitoring
      signalMonitoring.forEach(entry => {
        if (entry.active_monitors === 0) {
          monitoringInactive.push(entry);
        }
      });
    }

    const diagnostics = {
      problem_all_tps_hit: problemAllTpsHit.map(s => ({
        id: s.id,
        asset: s.asset_name,
        symbol: s.tradermade_symbol,
        tp_hits: s.tp_hits || [],
        total_tps: [s.tp1, s.tp2, s.tp3, s.tp4, s.tp5].filter(tp => tp !== null).length,
        status: s.status
      })),
      problem_single_tp_not_closed: problemSingleTpNotClosed.map(s => ({
        id: s.id,
        asset: s.asset_name,
        symbol: s.tradermade_symbol,
        tp_hits: s.tp_hits || [],
        status: s.status
      })),
      pending_ready_to_activate: pendingReadyToActivate.map(o => ({
        id: o.id,
        asset: o.asset_name,
        type: o.trade_type,
        entry: o.entry_price,
        bid: priceMap.get(o.tradermade_symbol)?.bid || 0,
        ask: priceMap.get(o.tradermade_symbol)?.ask || 0
      })),
      monitoring_inactive: monitoringInactive
    };

    console.log('✅ Diagnostic completed successfully');
    
    return new Response(JSON.stringify({
      success: true,
      data: diagnostics,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Signal diagnostic error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
