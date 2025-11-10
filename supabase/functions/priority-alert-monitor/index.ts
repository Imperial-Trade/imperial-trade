
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

async function fetchEnhancedPrice(symbol: string, supabase: any, redis: any): Promise<PriceUpdate | null> {
  const priority = getPriorityLevel(symbol);
  console.log(`🔍 ${priority.toUpperCase()} priority fetch for ${symbol} from Redis/Database`);

  try {
    // Try Redis first (same source as WebSocket live feed)
    if (redis) {
      try {
        const redisKey = `price:${symbol}`;
        const cachedPrice = await redis.get(redisKey);
        if (cachedPrice) {
          const priceData = JSON.parse(cachedPrice);
          console.log(`✅ Redis hit: ${symbol} Bid: $${priceData.bid?.toFixed(5)} Ask: $${priceData.ask?.toFixed(5)} (DigitalOcean source)`);
          
          return {
            symbol,
            price: priceData.mid || priceData.price,
            bid: priceData.bid,
            ask: priceData.ask,
            change: priceData.change || 0,
            changePercent: priceData.changePercent || 0,
            timestamp: priceData.timestamp || new Date().toISOString()
          };
        }
      } catch (redisError) {
        console.log(`⚠️ Redis miss for ${symbol}, falling back to database`);
      }
    }

    // Fallback to database market_prices table
    const { data: dbPrice, error } = await supabase
      .from('market_prices')
      .select('*')
      .eq('symbol', symbol)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !dbPrice) {
      console.log(`❌ No database price for ${symbol}:`, error?.message);
      return null;
    }

    // Check if database price is too stale (older than 30 seconds)
    const priceAge = Date.now() - new Date(dbPrice.timestamp).getTime();
    if (priceAge > 30000) {
      console.log(`⚠️ Stale database price for ${symbol} (${Math.round(priceAge/1000)}s old), skipping`);
      return null;
    }

    const priceUpdate: PriceUpdate = {
      symbol,
      price: dbPrice.mid,
      bid: dbPrice.bid,
      ask: dbPrice.ask,
      change: 0, // Database doesn't store change data
      changePercent: 0,
      timestamp: dbPrice.timestamp
    };

    console.log(`✅ Database hit: ${symbol} Bid: $${priceUpdate.bid?.toFixed(5)} Ask: $${priceUpdate.ask?.toFixed(5)} (DigitalOcean source)`);
    return priceUpdate;

  } catch (error) {
    console.error(`❌ Exception fetching ${symbol} from Redis/Database:`, error);
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

        // ✅ ENHANCED: Fetch complete signal data for proper notification
        const { data: signalData } = await supabase
          .from('trade_alerts')
          .select(`
            *,
            profiles:user_id (
              display_name,
              avatar_url,
              user_type
            )
          `)
          .eq('id', trigger.signal_id)
          .single();

        const profile = Array.isArray(signalData?.profiles) ? signalData.profiles[0] : signalData?.profiles;

        // Send enhanced notifications for critical events
        const notificationType = trigger.alert_type === 'stop_loss' ? 'stop_loss_hit' : 
                               result?.action === 'signal_closed' ? 'all_tps_hit' : 'tp_hit';
        
        const notificationPayload = {
          notifications: [{
            signal_id: trigger.signal_id,
            user_id: signalData?.user_id,
            author_id: signalData?.user_id,
            
            // Complete signal data
            asset_name: signalData?.asset_name || symbol,
            tradermade_symbol: signalData?.tradermade_symbol || symbol,
            symbol: signalData?.tradermade_symbol || symbol,
            trade_type: signalData?.trade_type,
            entry_price: signalData?.entry_price,
            
            // TP data
            tp1: signalData?.tp1,
            tp2: signalData?.tp2,
            tp3: signalData?.tp3,
            tp4: signalData?.tp4,
            tp5: signalData?.tp5,
            tp_hits: signalData?.tp_hits || [],
            tp_number: result?.tp_level,
            total_tps: result?.total_tps_hit,
            
            // Stop loss data
            stop_loss: signalData?.stop_loss,
            
            // Notification metadata
            notification_type: notificationType,
            alert_type: trigger.alert_type,
            target_price: trigger.target_price,
            triggered_price: trigger.trigger_price,
            status: signalData?.status,
            
            // Author data for UI display
            author_name: profile?.display_name || 'Educator',
            author_avatar_url: profile?.avatar_url,
            author_user_type: profile?.user_type || 'educator',
            
            // Timestamps
            created_at: signalData?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            
            // Result metadata
            action: result?.action,
            remaining_tps: result?.remaining_tps,
            
            // Delivery configuration
            delivery_channels: ['push', 'in_app'],
            priority_level: trigger.priority_order === 1 ? 3 : 2,
            change_types: [notificationType],
            include_creator: false
          }]
        };

        // 🚫 DISABLED: Old notification system removed
        // The new instant_notification_trigger handles all notifications automatically
        console.log('✅ Notification will be sent automatically by database trigger');
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

    // Initialize Redis for reading cached prices (same source as WebSocket)
    let redis = null;
    try {
      const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
      const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
      if (redisUrl && redisToken) {
        redis = {
          async get(key: string) {
            const response = await fetch(`${redisUrl}/get/${key}`, {
              headers: { 'Authorization': `Bearer ${redisToken}` }
            });
            const data = await response.json();
            return data.result;
          }
        };
      }
    } catch (error) {
      console.log('⚠️ Redis unavailable, using database only:', (error as Error).message);
    }

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

      const priceData = await fetchEnhancedPrice(symbol, supabase, redis);
      if (priceData) {
        setCachedPrice(symbol, priceData, priorityLevel);
        results.push(priceData);
        
        console.log(`💾 Cached ${symbol} for ${priorityLevel === 'critical' ? '0.5s' : priorityLevel === 'high' ? '1s' : '2s'} (${priorityLevel})`);
        
        if (priorityLevel !== 'normal') {
          await processEnhancedAlerts(supabase, symbol, priceData);
        }
      }
    }

    const criticalSymbols = requestedSymbols.filter((s: string) => slActiveSymbols.has(s));
    const highSymbols = requestedSymbols.filter((s: string) => tpActiveSymbols.has(s) && !slActiveSymbols.has(s));
    const normalSymbols = requestedSymbols.filter((s: string) => !slActiveSymbols.has(s) && !tpActiveSymbols.has(s));

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
        details: (error as Error).message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
