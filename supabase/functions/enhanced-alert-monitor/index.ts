
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://kmuoqkcxguafxulqlbmi.supabase.co';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// TraderMade API configuration
const TRADERMADE_SYMBOLS = ['XAUUSD', 'BTCUSD', 'USA30USD', 'NAS100USD', 'EURUSD'];
const CLIENT_TO_UPSTREAM: Record<string, string> = {
  XAUUSD: 'XAUUSD',
  BTCUSD: 'BTCUSD',
  EURUSD: 'EURUSD',
  USA30USD: 'US30',
  NAS100USD: 'NAS100',
};

// Rate limiting for TraderMade API
let globalRateLimitCount = 0;
let lastRateLimitReset = Date.now();
const RATE_LIMIT_PER_MINUTE = 1200;

function isRateLimited(): boolean {
  const now = Date.now();
  if (now - lastRateLimitReset > 60000) {
    globalRateLimitCount = 0;
    lastRateLimitReset = now;
  }
  return globalRateLimitCount >= RATE_LIMIT_PER_MINUTE;
}

function toUpstreamSymbol(clientSymbol: string): string {
  return CLIENT_TO_UPSTREAM[clientSymbol] || clientSymbol;
}

// Enhanced price fetching with pending limit activation
async function fetchAndProcessPrices(): Promise<void> {
  const apiKey = Deno.env.get('TRADERMADE_API_KEY');
  
  if (!apiKey) {
    console.log('⚠️ TRADERMADE_API_KEY not configured');
    return;
  }

  console.log('🔄 Starting enhanced alert monitoring cycle');

  // Get all symbols that need monitoring (active alerts + pending limits)
  const { data: symbolsToMonitor, error: symbolsError } = await supabase
    .from('trade_alerts')
    .select('tradermade_symbol')
    .in('status', ['active', 'partially_profited', 'pending'])
    .neq('tradermade_symbol', null);

  if (symbolsError) {
    console.error('❌ Error fetching symbols to monitor:', symbolsError);
    return;
  }

  const uniqueSymbols = [...new Set(symbolsToMonitor?.map(s => s.tradermade_symbol) || [])];
  console.log(`📊 Monitoring ${uniqueSymbols.length} symbols:`, uniqueSymbols);

  // Process each symbol
  for (const clientSymbol of uniqueSymbols) {
    if (isRateLimited()) {
      console.log('⏱️ Rate limit reached, pausing');
      break;
    }

    try {
      globalRateLimitCount++;
      const upstream = toUpstreamSymbol(clientSymbol);
      const url = `https://marketdata.tradermade.com/api/v1/live?currency=${upstream}&api_key=${apiKey}`;
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Enhanced-Alert-Monitor/1.0'
        }
      });

      if (!response.ok) {
        console.error(`❌ TraderMade API error for ${clientSymbol}: ${response.status}`);
        continue;
      }

      const data = await response.json();

      if (data.quotes && Array.isArray(data.quotes) && data.quotes.length > 0) {
        const quote = data.quotes[0];
        const bid = parseFloat(quote.bid) || 0;
        const ask = parseFloat(quote.ask) || 0;
        const mid = (bid + ask) / 2;

        if (bid > 0 && ask > 0) {
          console.log(`💹 ${clientSymbol}: bid=${bid}, ask=${ask}, mid=${mid}`);

          // Store price using enhanced function
          const { error: storeError } = await supabase.rpc('upsert_market_price_enhanced', {
            p_symbol: clientSymbol,
            p_bid: bid,
            p_ask: ask,
            p_mid: mid,
            p_timestamp: new Date().toISOString()
          });

          if (storeError) {
            console.error(`❌ Error storing price for ${clientSymbol}:`, storeError);
            continue;
          }

          // Check for pending limit order activation
          await checkPendingLimitActivation(clientSymbol, bid, ask);

          // Process alerts using enhanced function
          const { data: alertResults, error: alertError } = await supabase.rpc('process_price_alerts_enhanced', {
            p_symbol: clientSymbol,
            p_current_bid: bid,
            p_current_ask: ask
          });

          if (alertError) {
            console.error(`❌ Alert processing error for ${clientSymbol}:`, alertError);
            continue;
          }

          if (alertResults && Array.isArray(alertResults)) {
            const triggeredAlerts = alertResults.filter((alert: any) => alert.triggered);
            
            if (triggeredAlerts.length > 0) {
              console.log(`🔔 Found ${triggeredAlerts.length} triggered alerts for ${clientSymbol}`);
              
              // Handle each triggered alert using enhanced handler
              for (const alert of triggeredAlerts) {
                const { data: handleResult, error: handleError } = await supabase.rpc('handle_triggered_alert_enhanced', {
                  p_alert_id: alert.alert_id,
                  p_signal_id: alert.signal_id,
                  p_alert_type: alert.alert_type,
                  p_triggered_price: alert.trigger_price
                });

                if (handleError) {
                  console.error(`❌ Error handling alert ${alert.alert_id}:`, handleError);
                } else {
                  console.log(`✅ Alert handled: ${alert.alert_type} for signal ${alert.signal_id} - ${JSON.stringify(handleResult)}`);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error processing ${clientSymbol}:`, error);
    }

    // Small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log('✅ Enhanced alert monitoring cycle completed');
}

// New function to check and activate pending limit orders
async function checkPendingLimitActivation(symbol: string, bid: number, ask: number): Promise<void> {
  try {
    // Get pending limit orders for this symbol
    const { data: pendingOrders, error: pendingError } = await supabase
      .from('trade_alerts')
      .select('id, trade_type, entry_price, asset_name')
      .eq('status', 'pending')
      .eq('tradermade_symbol', symbol)
      .in('trade_type', ['buy_limit', 'sell_limit']);

    if (pendingError) {
      console.error(`❌ Error fetching pending orders for ${symbol}:`, pendingError);
      return;
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      return;
    }

    console.log(`⏳ Checking ${pendingOrders.length} pending limit orders for ${symbol}`);

    // Check activation conditions for each pending order
    for (const order of pendingOrders) {
      let shouldActivate = false;

      if (order.trade_type === 'buy_limit' && bid <= order.entry_price) {
        shouldActivate = true;
        console.log(`🟢 Buy limit activation: ${order.asset_name} - bid ${bid} <= entry ${order.entry_price}`);
      } else if (order.trade_type === 'sell_limit' && ask >= order.entry_price) {
        shouldActivate = true;
        console.log(`🔴 Sell limit activation: ${order.asset_name} - ask ${ask} >= entry ${order.entry_price}`);
      }

      if (shouldActivate) {
        // Activate the pending order
        const { error: activateError } = await supabase
          .from('trade_alerts')
          .update({
            status: 'active',
            activated_at: new Date().toISOString(),
            activation_price: order.entry_price,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);

        if (activateError) {
          console.error(`❌ Error activating order ${order.id}:`, activateError);
        } else {
          console.log(`✅ Activated pending ${order.trade_type} order: ${order.asset_name} at ${order.entry_price}`);
          
          // Log the activation
          await supabase
            .from('cron_job_logs')
            .insert({
              job_name: 'enhanced_alert_monitor',
              execution_time: new Date().toISOString(),
              records_affected: 1,
              status: 'success',
              error_message: `Activated ${order.trade_type} order ${order.id} (${order.asset_name}) at price ${order.entry_price}`
            });
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error in pending limit activation for ${symbol}:`, error);
  }
}

// Run reconciliation function to fix existing inconsistencies
async function runReconciliation(): Promise<void> {
  try {
    console.log('🔧 Running signal consistency reconciliation...');
    
    const { data: reconcileResult, error: reconcileError } = await supabase.rpc('reconcile_signal_consistency');
    
    if (reconcileError) {
      console.error('❌ Reconciliation error:', reconcileError);
    } else {
      console.log('✅ Reconciliation completed:', reconcileResult);
    }
  } catch (error) {
    console.error('❌ Reconciliation failed:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Enhanced Alert Monitor started');
    
    // Run reconciliation first to fix any existing issues
    await runReconciliation();
    
    // Then run the enhanced monitoring cycle
    await fetchAndProcessPrices();
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Enhanced alert monitoring completed',
      timestamp: new Date().toISOString(),
      dataSource: 'tradermade_enhanced'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Enhanced Alert Monitor error:', error);
    
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
