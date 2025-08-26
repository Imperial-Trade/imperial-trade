
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PriceUpdate {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

interface EnhancedAlertTrigger {
  alert_id: string;
  signal_id: string;
  alert_type: string;
  target_price: number;
  triggered: boolean;
  priority_order: number;
  trade_direction: string;
  trigger_price: number;
}

// Enhanced cache with bid/ask precision and SL priority
const enhancedCache = new Map<string, { 
  data: PriceUpdate, 
  expires: number, 
  isPriority: boolean,
  lastSLCheck: number 
}>();

const PRIORITY_CACHE_TTL = 500; // 500ms for SL monitoring
const REGULAR_CACHE_TTL = 2000; // 2s for TP monitoring
const SL_CHECK_INTERVAL = 1000; // Check SL every 1s

// Track symbols with active SL vs TP alerts
let slActiveSymbols = new Set<string>();
let tpActiveSymbols = new Set<string>();
let lastSymbolRefresh = 0;
const SYMBOL_REFRESH_INTERVAL = 5000;

function getPriorityLevel(symbol: string): 'critical' | 'high' | 'normal' {
  if (slActiveSymbols.has(symbol)) return 'critical'; // SL has highest priority
  if (tpActiveSymbols.has(symbol)) return 'high';     // TP has medium priority
  return 'normal';
}

function getCachedPrice(symbol: string): PriceUpdate | null {
  const cached = enhancedCache.get(symbol);
  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }
  enhancedCache.delete(symbol);
  return null;
}

function setCachedPrice(symbol: string, data: PriceUpdate, priority: 'critical' | 'high' | 'normal'): void {
  const ttl = priority === 'critical' ? PRIORITY_CACHE_TTL : 
               priority === 'high' ? PRIORITY_CACHE_TTL * 2 : REGULAR_CACHE_TTL;
  
  enhancedCache.set(symbol, {
    data,
    expires: Date.now() + ttl,
    isPriority: priority !== 'normal',
    lastSLCheck: Date.now()
  });
}

async function fetchEnhancedPrice(symbol: string): Promise<PriceUpdate | null> {
  const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
  if (!apiKey) {
    console.error('❌ TWELVE_DATA_API_KEY not configured');
    return null;
  }

  try {
    let apiSymbol = symbol;
    if (symbol === 'GOLD' || symbol === 'XAU/USD') {
      apiSymbol = 'XAU/USD';
    } else if (symbol === 'BTC/USD' || symbol === 'BTCUSD' || symbol === 'BTC') {
      apiSymbol = 'BTC/USD';
    }

    const priority = getPriorityLevel(symbol);
    console.log(`🚀 ${priority.toUpperCase()} priority fetch for ${symbol} -> ${apiSymbol}`);
    
    const url = `https://api.twelvedata.com/quote?symbol=${apiSymbol}&apikey=${apiKey}`;
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000)
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

    // Enhanced price update with bid/ask simulation for precise exit execution
    const midPrice = parseFloat(data.close);
    const spread = midPrice * 0.0001; // Simulate realistic spread
    
    const priceUpdate: PriceUpdate = {
      symbol,
      price: midPrice,
      bid: midPrice - (spread / 2),
      ask: midPrice + (spread / 2),
      change: parseFloat(data.change) || 0,
      changePercent: parseFloat(data.percent_change) || 0,
      timestamp: new Date().toISOString()
    };

    console.log(`✅ ${priority.toUpperCase()}: ${symbol} Bid: $${priceUpdate.bid.toFixed(5)} Ask: $${priceUpdate.ask.toFixed(5)} (${priceUpdate.changePercent >= 0 ? '+' : ''}${priceUpdate.changePercent}%)`);
    return priceUpdate;

  } catch (error) {
    console.error(`❌ Exception fetching ${symbol}:`, error);
    return null;
  }
}

async function refreshActiveSymbols(supabase: any): Promise<void> {
  if (Date.now() - lastSymbolRefresh < SYMBOL_REFRESH_INTERVAL) {
    return;
  }

  try {
    console.log('🔄 Refreshing active symbols with SL/TP prioritization...');
    
    // Get symbols with SL alerts (highest priority)
    const { data: slAlerts, error: slError } = await supabase
      .from('alert_monitoring')
      .select('symbol')
      .eq('is_active', true)
      .eq('alert_type', 'stop_loss');

    // Get symbols with TP alerts (medium priority)  
    const { data: tpAlerts, error: tpError } = await supabase
      .from('alert_monitoring')
      .select('symbol')
      .eq('is_active', true)
      .like('alert_type', 'take_profit_%');

    if (slError || tpError) {
      console.error('❌ Error fetching active symbols:', slError || tpError);
      return;
    }

    slActiveSymbols = new Set(slAlerts?.map((alert: any) => alert.symbol) || []);
    tpActiveSymbols = new Set(tpAlerts?.map((alert: any) => alert.symbol) || []);
    lastSymbolRefresh = Date.now();
    
    console.log(`✅ SL Symbols (CRITICAL): ${Array.from(slActiveSymbols).join(', ')}`);
    console.log(`✅ TP Symbols (HIGH): ${Array.from(tpActiveSymbols).join(', ')}`);
  } catch (error) {
    console.error('❌ Error refreshing symbols:', error);
  }
}

async function processEnhancedAlerts(supabase: any, symbol: string, priceData: PriceUpdate): Promise<void> {
  try {
    const priority = getPriorityLevel(symbol);
    console.log(`🔍 Processing ${priority} alerts for ${symbol} - Bid: ${priceData.bid.toFixed(5)} Ask: ${priceData.ask.toFixed(5)}`);
    
    // Use enhanced function with bid/ask precision and SL priority
    const { data: triggers, error } = await supabase
      .rpc('process_price_alerts_enhanced', {
        p_symbol: symbol,
        p_current_bid: priceData.bid,
        p_current_ask: priceData.ask
      });

    if (error) {
      console.error('❌ Error processing enhanced alerts:', error);
      return;
    }

    if (!triggers || triggers.length === 0) {
      return;
    }

    // Process triggered alerts with priority ordering (SL first, then TP)
    const triggeredAlerts = (triggers as EnhancedAlertTrigger[])
      .filter(t => t.triggered)
      .sort((a, b) => a.priority_order - b.priority_order);

    for (const trigger of triggeredAlerts) {
      if (trigger.triggered) {
        console.log(`🚨 ${trigger.priority_order === 1 ? 'STOP LOSS' : 'TAKE PROFIT'} TRIGGERED: ${trigger.alert_type} for ${symbol} at $${trigger.trigger_price.toFixed(5)} (target: $${trigger.target_price})`);
        
        // Handle with enhanced logic (SL priority, partial TP, auto-closure)
        const { data: result, error: handleError } = await supabase
          .rpc('handle_triggered_alert_enhanced', {
            p_alert_id: trigger.alert_id,
            p_signal_id: trigger.signal_id,
            p_alert_type: trigger.alert_type,
            p_triggered_price: trigger.trigger_price
          });

        if (handleError) {
          console.error('❌ Error handling enhanced alert:', handleError);
          continue;
        }

        console.log(`✅ Enhanced handling result: ${result?.action} - ${result?.reason || 'processed'}`);

        // Send enhanced notifications for critical events
        const notificationType = trigger.alert_type === 'stop_loss' ? 'stop_loss_hit' : 
                               result?.action === 'signal_closed' ? 'all_tps_hit' : 'take_profit_hit';
        
        const notificationPayload = {
          notifications: [{
            signal_id: trigger.signal_id,
            notification_type: notificationType,
            asset_name: symbol,
            triggered_price: trigger.trigger_price,
            alert_type: trigger.alert_type,
            action: result?.action,
            tp_level: result?.tp_level,
            total_tps_hit: result?.total_tps_hit,
            remaining_tps: result?.remaining_tps,
            delivery_channels: ['push', 'in_app', 'discord', 'telegram'],
            priority_level: trigger.priority_order === 1 ? 3 : 2, // SL = highest priority
            include_creator: false
          }]
        };

        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const functionUrl = 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/signal-notification-dispatcher';
        
        fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify(notificationPayload)
        }).catch(err => {
          console.error('❌ Enhanced notification dispatch failed:', err.message);
        });
      }
    }
  } catch (error) {
    console.error('❌ Error processing enhanced alert triggers:', error);
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

    await refreshActiveSymbols(supabase);

    const { symbols = [], force_refresh = false } = await req.json();
    
    // Prioritize SL symbols, then TP symbols
    const allActiveSymbols = [
      ...Array.from(slActiveSymbols),    // Critical priority
      ...Array.from(tpActiveSymbols)     // High priority
    ];
    
    const requestedSymbols = symbols.length > 0 ? symbols : allActiveSymbols;
    
    if (requestedSymbols.length === 0) {
      return new Response(
        JSON.stringify({ 
          prices: [],
          message: 'No active alerts to monitor',
          slSymbols: Array.from(slActiveSymbols),
          tpSymbols: Array.from(tpActiveSymbols)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔥 Enhanced monitoring for ${requestedSymbols.length} symbols with SL priority`);

    const results: PriceUpdate[] = [];
    
    // Process symbols in priority order (SL symbols first)
    for (const symbol of requestedSymbols) {
      const priorityLevel = getPriorityLevel(symbol);
      
      if (!force_refresh) {
        const cached = getCachedPrice(symbol);
        if (cached) {
          console.log(`📋 Cache hit for ${symbol} (${priorityLevel})`);
          results.push(cached);
          
          if (priorityLevel !== 'normal') {
            await processEnhancedAlerts(supabase, symbol, cached);
          }
          continue;
        }
      }

      const priceData = await fetchEnhancedPrice(symbol);
      if (priceData) {
        setCachedPrice(symbol, priceData, priorityLevel);
        results.push(priceData);
        
        console.log(`💾 Cached ${symbol} for ${priorityLevel === 'critical' ? '0.5s' : priorityLevel === 'high' ? '1s' : '2s'} (${priorityLevel})`);
        
        if (priorityLevel !== 'normal') {
          await processEnhancedAlerts(supabase, symbol, priceData);
        }
      }
    }

    const criticalSymbols = requestedSymbols.filter(s => slActiveSymbols.has(s));
    const highSymbols = requestedSymbols.filter(s => tpActiveSymbols.has(s) && !slActiveSymbols.has(s));
    const normalSymbols = requestedSymbols.filter(s => !slActiveSymbols.has(s) && !tpActiveSymbols.has(s));

    return new Response(
      JSON.stringify({
        prices: results,
        totalSymbols: requestedSymbols.length,
        criticalSymbols: criticalSymbols.length,
        highSymbols: highSymbols.length, 
        normalSymbols: normalSymbols.length,
        slActiveSymbols: Array.from(slActiveSymbols),
        tpActiveSymbols: Array.from(tpActiveSymbols),
        cacheStrategy: 'enhanced-priority-sl-first',
        features: ['SL_priority', 'bid_ask_precision', 'partial_TP_tracking', 'atomic_closure'],
        message: `Enhanced monitoring: ${criticalSymbols.length} SL (0.5s) + ${highSymbols.length} TP (1s) + ${normalSymbols.length} normal (2s)`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Enhanced priority alert monitor error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Enhanced monitoring failed',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
