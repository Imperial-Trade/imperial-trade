import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

interface AlertTrigger {
  alert_id: string;
  signal_id: string;
  alert_type: string;
  target_price: number;
  triggered: boolean;
}

// Priority cache with 1-second TTL for active alerts, 30-second for regular symbols
const priorityCache = new Map<string, { data: PriceUpdate, expires: number, isPriority: boolean }>();
const PRIORITY_CACHE_TTL = 1000; // 1 second for active alerts
const REGULAR_CACHE_TTL = 30000; // 30 seconds for regular symbols

// Track active alert symbols for priority monitoring
let activeAlertSymbols = new Set<string>();
let lastSymbolRefresh = 0;
const SYMBOL_REFRESH_INTERVAL = 10000; // Refresh active symbols every 10 seconds

function getPriorityLevel(symbol: string): 'priority' | 'regular' {
  return activeAlertSymbols.has(symbol) ? 'priority' : 'regular';
}

function getCachedPrice(symbol: string): PriceUpdate | null {
  const cached = priorityCache.get(symbol);
  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }
  priorityCache.delete(symbol);
  return null;
}

function setCachedPrice(symbol: string, data: PriceUpdate, isPriority: boolean): void {
  const ttl = isPriority ? PRIORITY_CACHE_TTL : REGULAR_CACHE_TTL;
  priorityCache.set(symbol, {
    data,
    expires: Date.now() + ttl,
    isPriority
  });
}

async function fetchPriceFromTwelveData(symbol: string): Promise<PriceUpdate | null> {
  const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
  if (!apiKey) {
    console.error('❌ TWELVE_DATA_API_KEY not configured');
    return null;
  }

  try {
    // Enhanced symbol format conversion
    let apiSymbol = symbol;
    if (symbol === 'GOLD' || symbol === 'XAU/USD') {
      apiSymbol = 'XAU/USD';
    } else if (symbol === 'BTC/USD' || symbol === 'BTCUSD' || symbol === 'BTC') {
      apiSymbol = 'BTC/USD';
    }

    console.log(`🚀 Priority fetch for ${symbol} -> ${apiSymbol}`);
    
    const url = `https://api.twelvedata.com/quote?symbol=${apiSymbol}&apikey=${apiKey}`;
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      console.error(`❌ API error for ${symbol}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data.status === 'error' || !data.close) {
      console.error(`❌ No price data for ${symbol}:`, data);
      return null;
    }

    const priceUpdate: PriceUpdate = {
      symbol,
      price: parseFloat(data.close),
      change: parseFloat(data.change) || 0,
      changePercent: parseFloat(data.percent_change) || 0,
      timestamp: new Date().toISOString()
    };

    console.log(`✅ Live price for ${symbol}: $${priceUpdate.price.toFixed(2)} (${priceUpdate.changePercent >= 0 ? '+' : ''}${priceUpdate.changePercent}%)`);
    return priceUpdate;

  } catch (error) {
    console.error(`❌ Exception fetching ${symbol}:`, error);
    return null;
  }
}

async function refreshActiveAlertSymbols(supabase: any): Promise<void> {
  if (Date.now() - lastSymbolRefresh < SYMBOL_REFRESH_INTERVAL) {
    return;
  }

  try {
    console.log('🔄 Refreshing active alert symbols...');
    
    const { data: activeAlerts, error } = await supabase
      .from('alert_monitoring')
      .select('symbol')
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error fetching active alerts:', error);
      return;
    }

    const newActiveSymbols = new Set(activeAlerts?.map((alert: any) => alert.symbol) || []);
    activeAlertSymbols = newActiveSymbols;
    lastSymbolRefresh = Date.now();
    
    console.log(`✅ Active alert symbols updated: ${Array.from(activeAlertSymbols).join(', ')}`);
  } catch (error) {
    console.error('❌ Error refreshing active symbols:', error);
  }
}

async function processAlertTriggers(supabase: any, symbol: string, currentPrice: number): Promise<void> {
  try {
    console.log(`🔍 Processing alerts for ${symbol} at price $${currentPrice}`);
    
    const { data: triggers, error } = await supabase
      .rpc('process_price_alerts', {
        p_symbol: symbol,
        p_current_price: currentPrice
      });

    if (error) {
      console.error('❌ Error processing alerts:', error);
      return;
    }

    if (!triggers || triggers.length === 0) {
      return;
    }

    // Process triggered alerts
    for (const trigger of triggers) {
      if (trigger.triggered) {
        console.log(`🚨 ALERT TRIGGERED: ${trigger.alert_type} for ${symbol} at $${currentPrice} (target: $${trigger.target_price})`);
        
        // Create notification record
        const notificationType = trigger.alert_type === 'stop_loss' ? 'stop_loss_hit' : 'take_profit_hit';
        
        const { error: notificationError } = await supabase
          .from('alert_notifications')
          .insert({
            alert_monitoring_id: trigger.alert_id,
            signal_id: trigger.signal_id,
            notification_type: notificationType,
            target_price: trigger.target_price,
            triggered_price: currentPrice,
            delivery_channels: ['realtime', 'discord', 'telegram'],
            delivery_status: {
              realtime: 'sent',
              discord: 'pending',
              telegram: 'pending'
            }
          });

        if (notificationError) {
          console.error('❌ Error creating notification:', notificationError);
        }

        // Update signal status based on alert type
        if (trigger.alert_type === 'stop_loss') {
          // Close signal with stop loss reason
          const { error: updateError } = await supabase
            .from('trade_alerts')
            .update({
              status: 'closed',
              close_reason: 'stop_loss',
              updated_at: new Date().toISOString()
            })
            .eq('id', trigger.signal_id);

          if (updateError) {
            console.error('❌ Error updating signal for SL:', updateError);
          } else {
            console.log(`✅ Signal ${trigger.signal_id} closed due to stop loss`);
          }
        } else if (trigger.alert_type.startsWith('take_profit_')) {
          // Update TP hits array
          const tpNumber = parseInt(trigger.alert_type.split('_')[2]);
          
          const { data: currentSignal, error: fetchError } = await supabase
            .from('trade_alerts')
            .select('tp_hits')
            .eq('id', trigger.signal_id)
            .single();

          if (!fetchError && currentSignal) {
            const currentTpHits = currentSignal.tp_hits || [];
            const newTpHits = [...currentTpHits, tpNumber].sort();

            const { error: updateError } = await supabase
              .from('trade_alerts')
              .update({
                tp_hits: newTpHits,
                updated_at: new Date().toISOString()
              })
              .eq('id', trigger.signal_id);

            if (updateError) {
              console.error('❌ Error updating TP hits:', updateError);
            } else {
              console.log(`✅ Signal ${trigger.signal_id} TP${tpNumber} hit`);
            }
          }
        }

        // Deactivate the triggered alert
        const { error: deactivateError } = await supabase
          .from('alert_monitoring')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', trigger.alert_id);

        if (deactivateError) {
          console.error('❌ Error deactivating alert:', deactivateError);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error processing alert triggers:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Refresh active alert symbols
    await refreshActiveAlertSymbols(supabase);

    const { symbols = [], force_refresh = false } = await req.json();
    
    // Default to active alert symbols if no symbols provided
    const requestedSymbols = symbols.length > 0 ? symbols : Array.from(activeAlertSymbols);
    
    if (requestedSymbols.length === 0) {
      return new Response(
        JSON.stringify({ 
          prices: [],
          message: 'No active alerts to monitor',
          activeAlertSymbols: Array.from(activeAlertSymbols)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔥 Priority monitoring for ${requestedSymbols.length} symbols:`, requestedSymbols);

    const results: PriceUpdate[] = [];
    
    for (const symbol of requestedSymbols) {
      const priorityLevel = getPriorityLevel(symbol);
      
      // Check cache first (unless force refresh)
      if (!force_refresh) {
        const cached = getCachedPrice(symbol);
        if (cached) {
          console.log(`📋 Cache hit for ${symbol} (${priorityLevel})`);
          results.push(cached);
          
          // Process alerts even with cached data
          if (priorityLevel === 'priority') {
            await processAlertTriggers(supabase, symbol, cached.price);
          }
          continue;
        }
      }

      // Fetch fresh price data
      const priceData = await fetchPriceFromTwelveData(symbol);
      if (priceData) {
        const isPriority = priorityLevel === 'priority';
        setCachedPrice(symbol, priceData, isPriority);
        results.push(priceData);
        
        console.log(`💾 Cached ${symbol} for ${isPriority ? '1 second' : '30 seconds'} (${priorityLevel})`);
        
        // Process alerts for priority symbols
        if (isPriority) {
          await processAlertTriggers(supabase, symbol, priceData.price);
        }
      }
    }

    const prioritySymbols = requestedSymbols.filter(s => getPriorityLevel(s) === 'priority');
    const regularSymbols = requestedSymbols.filter(s => getPriorityLevel(s) === 'regular');

    return new Response(
      JSON.stringify({
        prices: results,
        totalSymbols: requestedSymbols.length,
        prioritySymbols: prioritySymbols.length,
        regularSymbols: regularSymbols.length,
        activeAlertSymbols: Array.from(activeAlertSymbols),
        cacheStrategy: 'dual-speed',
        message: `Monitoring ${prioritySymbols.length} priority (1s cache) + ${regularSymbols.length} regular (30s cache) symbols`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Priority alert monitor error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process priority alerts',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});