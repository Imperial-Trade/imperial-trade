
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

    // Run the comprehensive diagnostic query
    const diagnosticQuery = `
      WITH signals AS (
        SELECT 
          id,
          asset_name,
          tradermade_symbol,
          status,
          tp1, tp2, tp3, tp4, tp5,
          tp_hits,
          ((CASE WHEN tp1 IS NOT NULL THEN 1 ELSE 0 END) +
           (CASE WHEN tp2 IS NOT NULL THEN 1 ELSE 0 END) +
           (CASE WHEN tp3 IS NOT NULL THEN 1 ELSE 0 END) +
           (CASE WHEN tp4 IS NOT NULL THEN 1 ELSE 0 END) +
           (CASE WHEN tp5 IS NOT NULL THEN 1 ELSE 0 END)) AS total_tps,
          array_length(tp_hits, 1) AS tp_hits_count
        FROM trade_alerts
        WHERE status IN ('active','partially_profited','pending')
      ),
      problem_all_tps_hit AS (
        SELECT *
        FROM signals
        WHERE total_tps > 0 
          AND tp_hits_count IS NOT NULL 
          AND tp_hits_count >= total_tps
          AND status <> 'closed'
      ),
      problem_single_tp_not_closed AS (
        SELECT *
        FROM signals
        WHERE total_tps = 1
          AND tp_hits IS NOT NULL
          AND tp_hits @> ARRAY[1]
          AND status <> 'closed'
      ),
      pending_limits AS (
        SELECT 
          ta.id,
          ta.asset_name,
          ta.trade_type,
          ta.entry_price,
          ta.tradermade_symbol,
          mp.bid,
          mp.ask
        FROM trade_alerts ta
        JOIN market_prices mp 
          ON mp.symbol = ta.tradermade_symbol
        WHERE ta.status = 'pending'
          AND ta.trade_type IN ('buy_limit', 'sell_limit')
      ),
      pending_ready AS (
        SELECT *
        FROM pending_limits
        WHERE (trade_type = 'buy_limit' AND bid <= entry_price)
           OR (trade_type = 'sell_limit' AND ask >= entry_price)
      ),
      monitoring_inactive AS (
        SELECT 
          ta.id AS signal_id, 
          ta.asset_name, 
          ta.status, 
          COUNT(am.*) AS total_monitors, 
          COUNT(*) FILTER (WHERE am.is_active) AS active_monitors
        FROM trade_alerts ta
        LEFT JOIN alert_monitoring am 
          ON am.signal_id = ta.id
        WHERE ta.status IN ('active','partially_profited')
        GROUP BY ta.id, ta.asset_name, ta.status
        HAVING COUNT(am.*) = 0 OR COUNT(*) FILTER (WHERE am.is_active) = 0
      )
      SELECT jsonb_build_object(
        'problem_all_tps_hit', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', id,
            'asset', asset_name,
            'symbol', tradermade_symbol,
            'tp_hits', tp_hits,
            'total_tps', total_tps,
            'status', status
          )) FROM problem_all_tps_hit
        ), '[]'::jsonb),
        'problem_single_tp_not_closed', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', id,
            'asset', asset_name,
            'symbol', tradermade_symbol,
            'tp_hits', tp_hits,
            'status', status
          )) FROM problem_single_tp_not_closed
        ), '[]'::jsonb),
        'pending_ready_to_activate', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', id,
            'asset', asset_name,
            'type', trade_type,
            'entry', entry_price,
            'bid', bid,
            'ask', ask
          )) FROM pending_ready
        ), '[]'::jsonb),
        'monitoring_inactive', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'signal_id', signal_id,
            'asset', asset_name,
            'status', status,
            'total_monitors', total_monitors,
            'active_monitors', active_monitors
          )) FROM monitoring_inactive
        ), '[]'::jsonb)
      ) AS diagnostics
    `;

    const { data, error } = await supabase.rpc('execute_diagnostic_query', { 
      query_sql: diagnosticQuery 
    });

    if (error) {
      console.error('❌ Diagnostic query failed:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Diagnostic completed successfully');
    
    return new Response(JSON.stringify({
      success: true,
      data: data || {},
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
