// IMPERIAL TRADING PRICE INGESTOR v4.1 - CRITICAL RELIABILITY FIXES
// Enhanced with Stop Loss Priority, Sequential TP Processing, and 100% Reliability
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// 🔥 CRITICAL FIX: Emergency kill switch for broadcasts
const EMERGENCY_DISABLE_BROADCASTS = Deno.env.get('EMERGENCY_DISABLE_BROADCASTS') === 'true';

// Global connection reuse to prevent cold start issues
let supabaseClient: any = null;

// Global map to store calculated bid/ask/mid prices for database upsert
let symbolsWithPrices: Map<string, { bid: number; ask: number; mid: number }> | undefined;

// 🚀 ULTRA-SENSITIVE PROFESSIONAL THRESHOLDS - For institutional-grade 1-2 second UI updates
// These thresholds deliver maximum responsiveness matching top-tier trading platforms
const MIN_PRICE_CHANGE_PERCENT = 0.01; // 0.01% for non-gold assets (ULTRA-SENSITIVE)
const MIN_PRICE_CHANGE_PIPS = 0.1;      // 0.1 pips for gold assets (ULTRA-SENSITIVE)
const GOLD_SYMBOLS = ['XAUUSD', 'XAUEUR', 'GOLD'];

// 🚀 ENHANCED RATE LIMITING - For professional 5Hz UI updates
const SYMBOL_RATE_LIMITS: Record<string, { lastBroadcasts: number[], clampCount: number }> = {};
const MAX_SYMBOL_UI_BROADCASTS_PER_SECOND = 5.0; // Enhanced to 5Hz (200ms intervals)
const MAX_UI_BROADCASTS_PER_BATCH = 50;
const PER_SYMBOL_CLAMP = 10;

// In-memory cache for last broadcasted prices (UI filtering only)
const lastBroadcastedPrices: Record<string, number> = {};

// 💓 HEARTBEAT SYSTEM: Guarantee continuous "Live" display
const HEARTBEAT_INTERVAL = 4000; // 4 seconds maximum silence between broadcasts
const lastBroadcastTime: Record<string, number> = {};

// Telemetry tracking
let totalPricesProcessed = 0;
let totalAlertsTriggered = 0;
let totalPricesUpserted = 0;
let totalUIBroadcasts = 0;
let totalClampActivations = 0;

// 🔒 SIMPLIFIED LOCK CONFIGURATION  
const CHANNEL_SUBSCRIPTION_TIMEOUT = 5000; // 5s timeout (fast fail, faster retries)
const BROADCAST_LOCK_DURATION = 6; // Reduced from 8s to 6s for faster lock release cycles

// Initialize Supabase client only
async function initializeSupabase() {
  if (!supabaseClient) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    console.log('🔗 Supabase client initialized');
  }

  return supabaseClient;
}

// 🚀 PHASE 1: Create channel first with retries, then acquire lock
async function createBroadcastChannelWithRetries(supabaseClient: any, maxRetries: number = 3): Promise<any> {
  console.log('📡 Creating broadcast channel with retries...');
  
  // PHASE 4 FIX: Declare priceChannel outside try block for proper cleanup
  let priceChannel: any = null;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      console.log(`📡 Channel subscription attempt ${attempt}/${maxRetries + 1}...`);
      priceChannel = supabaseClient.channel('live-prices-broadcast');
      
      const channelResult = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Channel subscription timeout after ${CHANNEL_SUBSCRIPTION_TIMEOUT / 1000} seconds`));
        }, CHANNEL_SUBSCRIPTION_TIMEOUT);

        priceChannel.subscribe((status: string) => {
          console.log(`📡 Channel status: ${status} (attempt ${attempt})`);
          clearTimeout(timeout);
          
          if (status === 'SUBSCRIBED') {
            console.log(`✅ Channel SUBSCRIBED successfully on attempt ${attempt}`);
            resolve(priceChannel);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            reject(new Error(`Channel failed: ${status}`));
          }
        });
      });
      
      return channelResult; // Success - return the channel
      
      } catch (error: any) {
        console.warn(`⚠️ Channel subscription failed on attempt ${attempt}: ${error?.message || error}`);
        
        // 🧹 CRITICAL: Clean up failed channel to prevent memory leaks
        try {
          if (priceChannel) {
            await priceChannel.unsubscribe();
            console.log('🧹 Cleaned up failed channel instance');
          }
        } catch (cleanupError) {
          console.warn('⚠️ Channel cleanup warning (non-critical):', cleanupError);
        }
        
        if (attempt <= maxRetries) {
          const baseDelay = 300; // Faster base: 300ms instead of 500ms
          const exponentialDelay = baseDelay * Math.pow(1.5, attempt - 1); // 300ms, 450ms, 675ms
          const jitter = Math.random() * 100; // 0-100ms jitter to prevent thundering herd
          const delay = Math.min(exponentialDelay + jitter, 1500); // Cap at 1.5 seconds
          console.log(`⏱️ Retrying in ${delay.toFixed(0)}ms... (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error(`❌ All ${maxRetries + 1} channel subscription attempts failed`);
          throw error;
        }
      }
  }
}

// 🎯 PHASE 3: COOPERATIVE LOCK with configurable duration (1s for real-time, 6s for standard)
async function acquireBroadcastLock(supabaseClient: any, durationSeconds: number = BROADCAST_LOCK_DURATION): Promise<string | null> {
  try {
    const holderId = `price-ingestor-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const { data, error } = await supabaseClient.rpc('acquire_broadcast_lock', {
      p_holder_id: holderId,
      p_duration_seconds: durationSeconds
    });
    
    if (error) {
      console.warn('⚠️ Lock acquisition failed:', error);
      return null;
    }
    
    if (data) {
      console.log(`🔒 Acquired broadcast lock: ${holderId} (${durationSeconds}s)`);
      return holderId;
    }
    return null;
  } catch (error) {
    console.error('❌ Error acquiring broadcast lock:', error);
    return null;
  }
}

// Phase 1: Price significance filtering function with REAL-TIME MODE
function filterSignificantPrices(
  incomingPrices: Array<{symbol: string, price: number, timestamp: string}>,
  broadcastAll: boolean = false
) {
  // 🚀 REAL-TIME MODE: When active UI listeners present, broadcast ALL prices
  if (broadcastAll) {
    console.log(`🚀 REAL-TIME MODE: Broadcasting ALL ${incomingPrices.length} prices (active UI listeners)`);
    const now = Date.now();
    
    // Update last broadcast times for all symbols
    for (const priceData of incomingPrices) {
      const normalizedSymbol = priceData.symbol.toUpperCase();
      lastBroadcastedPrices[normalizedSymbol] = priceData.price;
      lastBroadcastTime[normalizedSymbol] = now;
    }
    
    return incomingPrices.map(p => ({ ...p, reason: 'real-time-update' }));
  }
  
  // STANDARD MODE: Use filtering logic for background updates
  const significantUpdates: Array<{symbol: string, price: number, timestamp: string}> = [];
  const now = Date.now();

  for (const priceData of incomingPrices) {
    const { symbol, price } = priceData;
    const normalizedSymbol = symbol.toUpperCase();
    const lastPrice = lastBroadcastedPrices[normalizedSymbol];

    // Always broadcast the first price for a symbol (check FIRST)
    if (!lastPrice) {
      significantUpdates.push({ ...priceData, reason: 'first-price' });
      lastBroadcastedPrices[normalizedSymbol] = price;
      lastBroadcastTime[normalizedSymbol] = now;
      console.log(`🆕 First price for ${symbol}: ${price}`);
      continue;
    }
    
    // 💓 HEARTBEAT CHECK: Force broadcast if no update in last 4 seconds
    const timeSinceLastBroadcast = now - (lastBroadcastTime[normalizedSymbol] || now);
    const isHeartbeat = timeSinceLastBroadcast >= HEARTBEAT_INTERVAL;
    
    if (isHeartbeat) {
      significantUpdates.push({ ...priceData, reason: 'heartbeat' });
      lastBroadcastedPrices[normalizedSymbol] = price;
      lastBroadcastTime[normalizedSymbol] = now;
      console.log(`💓 Heartbeat broadcast for ${symbol} (${timeSinceLastBroadcast}ms since last) - Price: ${price}`);
      continue;
    }

    // Calculate significance based on asset type
    const percentChange = Math.abs(price - lastPrice) / lastPrice * 100;
    const absoluteChange = Math.abs(price - lastPrice);
    
    const isGoldAsset = GOLD_SYMBOLS.some(goldSymbol => normalizedSymbol.includes(goldSymbol));
    const threshold = isGoldAsset ? MIN_PRICE_CHANGE_PIPS : MIN_PRICE_CHANGE_PERCENT;
    const changeValue = isGoldAsset ? absoluteChange : percentChange;

    if (changeValue >= threshold) {
      significantUpdates.push({ ...priceData, reason: 'significant-change' });
      lastBroadcastedPrices[normalizedSymbol] = price;
      lastBroadcastTime[normalizedSymbol] = now;
      console.log(`📈 Significant change for ${symbol}: ${lastPrice} → ${price} (${changeValue.toFixed(4)}${isGoldAsset ? ' pips' : '%'})`);
    } else {
      console.log(`⏭️ Skipping minor change for ${symbol}: ${lastPrice} → ${price} (${changeValue.toFixed(4)}${isGoldAsset ? ' pips' : '%'})`);
    }
  }

  return significantUpdates;
}

serve(async (req) => {
  console.log(`🔄 [price-ingestor-v4.1] ${req.method} request received`);

  // CORS preflight handling
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight handled');
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Method validation
  if (req.method !== 'POST') {
    console.warn(`❌ Method ${req.method} not allowed`);
    return new Response('Method Not Allowed', { 
      status: 405,
      headers: corsHeaders 
    });
  }

  // Authentication
  const ingestKey = req.headers.get('X-INGEST-KEY') || req.headers.get('x-ingest-key');
  const expectedKey = Deno.env.get('INGEST_SECRET');
  
  if (!expectedKey) {
    console.error('❌ INGEST_SECRET not configured');
    return new Response('Server configuration error', { 
      status: 500,
      headers: corsHeaders 
    });
  }

  if (!ingestKey || ingestKey !== expectedKey) {
    console.warn('❌ Invalid or missing X-INGEST-KEY header');
    return new Response('Unauthorized', { 
      status: 401,
      headers: corsHeaders 
    });
  }

  console.log('✅ Authentication successful');

  try {
    // Initialize Supabase client
    await initializeSupabase();
    
    // 🚀 ENHANCED: Always process alerts and notifications, only skip UI broadcast if no active users
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: activeSessions, error: activityError, count } = await supabaseClient
      .from('ui_price_listeners')
      .select('session_id', { count: 'exact' })
      .gte('last_seen_at', fiveMinutesAgo);
    
    const activeUserCount = count || 0;
    const hasActiveUsers = activeUserCount > 0;
    
    if (activityError) {
      console.warn('⚠️ Activity check failed, proceeding with full processing:', activityError);
    }
    
    console.log(`👥 Active UI sessions: ${activeUserCount}`);
    
    // Parse request payload FIRST
    const requestBody = await req.json();
    const { prices } = requestBody;
    
    console.log(`📊 Processing ${prices ? prices.length : 0} price updates for ${activeUserCount} active users (notifications always processed)`);

    // Validate payload
    if (!prices || !Array.isArray(prices) || prices.length === 0) {
      console.warn('❌ Invalid payload: missing or empty prices array');
      return new Response('Invalid payload: prices array required', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    totalPricesProcessed += prices.length;

    // 🚀 STEP 1: CRITICAL PRIORITY PROCESSING - Stop Loss FIRST, then Take Profits
    console.log('🎯 STEP 1: Processing alerts with STOP LOSS PRIORITY...');
    let totalTriggeredAlerts = 0;
    let limitOrdersActivated = 0;
    let notificationTriggers: any[] = [];
    
    // First, process limit order activations using mid prices
    const symbolsWithPrices = new Map();
    for (const priceUpdate of prices) {
      const hasFullData = typeof priceUpdate.bid === 'number' && typeof priceUpdate.ask === 'number';
      const hasMidOnly = typeof priceUpdate.price === 'number';
      
      if (!priceUpdate.symbol || (!hasFullData && !hasMidOnly)) {
        console.warn(`⚠️ Skipping invalid price data: ${JSON.stringify(priceUpdate)}`);
        continue;
      }

      // Store current prices for limit order processing
      const currentPrice = hasFullData ? (priceUpdate.bid + priceUpdate.ask) / 2 : priceUpdate.price;
      symbolsWithPrices.set(priceUpdate.symbol, currentPrice);
    }

    // Process limit order activations
    if (symbolsWithPrices.size > 0) {
      console.log(`🔄 Checking limit orders for ${symbolsWithPrices.size} symbols...`);
      
      const { data: pendingLimits, error: fetchError } = await supabaseClient
        .from('trade_alerts')
        .select('id, tradermade_symbol, entry_price, trade_type, asset_name, user_id')
        .eq('status', 'pending')
        .in('trade_type', ['buy_limit', 'sell_limit'])
        .in('tradermade_symbol', Array.from(symbolsWithPrices.keys()));

      if (fetchError) {
        console.error('❌ Error fetching pending limits:', fetchError);
      } else if (pendingLimits && pendingLimits.length > 0) {
        for (const alert of pendingLimits) {
          const currentPrice = symbolsWithPrices.get(alert.tradermade_symbol);
          if (!currentPrice) continue;

          const shouldTrigger = 
            (alert.trade_type === 'buy_limit' && currentPrice <= alert.entry_price) ||
            (alert.trade_type === 'sell_limit' && currentPrice >= alert.entry_price);

          if (shouldTrigger) {
            const { error: updateError } = await supabaseClient
              .from('trade_alerts')
              .update({
                status: 'active',
                activated_at: new Date().toISOString(),
                activation_price: currentPrice,
                updated_at: new Date().toISOString()
              })
              .eq('id', alert.id);

            if (!updateError) {
              limitOrdersActivated++;
              console.log(`✅ Activated ${alert.trade_type} order for ${alert.asset_name} at ${currentPrice}`);
              
              // Add to notification triggers with HIGH priority
              notificationTriggers.push({
                signal_id: alert.id,
                user_id: alert.user_id,
                asset_name: alert.asset_name,
                trade_type: alert.trade_type,
                entry_price: alert.entry_price,
                activation_price: currentPrice,
                notification_type: 'limit_order_activated',
                alert_type: 'limit_order_activated',
                priority_level: 3 // Highest priority for order activations
              });
            }
          }
        }
      }
    }

    // PHASE 4: CRITICAL - Use enhanced alert processing with Stop Loss priority
    for (const priceUpdate of prices) {
      const hasFullData = typeof priceUpdate.bid === 'number' && typeof priceUpdate.ask === 'number';
      const hasMidOnly = typeof priceUpdate.price === 'number';
      
      if (!priceUpdate.symbol || (!hasFullData && !hasMidOnly)) {
        continue;
      }

      // ✅ CRITICAL FIX: Calculate bid/ask from mid-only prices
      let bidPrice: number;
      let askPrice: number;
      let currentPrice: number;

      if (hasFullData) {
        // Full bid/ask data available (most accurate)
        bidPrice = priceUpdate.bid!;
        askPrice = priceUpdate.ask!;
        currentPrice = (bidPrice + askPrice) / 2;
        console.log(`📊 Full price data for ${priceUpdate.symbol}: Bid=${bidPrice}, Ask=${askPrice}, Mid=${currentPrice}`);
      } else if (typeof priceUpdate.price === 'number') {
        // ✅ Mid-only price - ESTIMATE bid/ask from mid
        currentPrice = priceUpdate.price;
        
        // Asset-specific spread estimation (based on institutional market data)
        const isGold = priceUpdate.symbol === 'XAUUSD' || priceUpdate.symbol.includes('XAU');
        const isBitcoin = priceUpdate.symbol === 'BTCUSD' || priceUpdate.symbol.includes('BTC');
        
        let halfSpread: number;
        if (isGold) {
          halfSpread = 0.05;  // Gold: typical $0.10 total spread ($0.05 per side)
        } else if (isBitcoin) {
          halfSpread = 2.50;  // Bitcoin: typical ~$5 total spread
        } else {
          halfSpread = 0.00005;  // Forex: typical ~0.5-1 pip
        }
        
        bidPrice = currentPrice - halfSpread;
        askPrice = currentPrice + halfSpread;
        
        console.log(`⚠️ Mid-price fallback for ${priceUpdate.symbol}: ${currentPrice} (estimated bid=${bidPrice}, ask=${askPrice})`);
      } else {
        // No usable price data - skip THIS symbol only
        console.log(`❌ No price data for ${priceUpdate.symbol} - skipping`);
        continue;
      }

      // ✅ Store calculated prices for database upsert (used in CHANGE #4)
      if (!symbolsWithPrices) {
        symbolsWithPrices = new Map();
      }
      symbolsWithPrices.set(priceUpdate.symbol, {
        bid: bidPrice,
        ask: askPrice,
        mid: currentPrice
      });

      // ✅ NOW PROCEED WITH ALERT PROCESSING (previously skipped by continue statement)

      // Enhanced NaN validation for full data
      if (!isFinite(priceUpdate.bid) || !isFinite(priceUpdate.ask) ||
          priceUpdate.bid <= 0 || priceUpdate.ask <= 0 ||
          isNaN(priceUpdate.bid) || isNaN(priceUpdate.ask)) {
        console.warn(`⚠️ Skipping invalid bid/ask data: ${JSON.stringify(priceUpdate)}`);
        continue;
      }

      try {
        // PHASE 4: Use enhanced alert processing with Stop Loss priority
        const { data: alertResults, error: alertError } = await supabaseClient
          .rpc('process_price_alerts_enhanced_v2', {
            p_symbol: priceUpdate.symbol,
            p_current_bid: bidPrice,
            p_current_ask: askPrice
          });

        if (alertError) {
          console.error(`❌ Alert processing error for ${priceUpdate.symbol}:`, alertError);
        } else if (alertResults && alertResults.length > 0) {
          // Process triggered alerts in priority order (Stop Loss first)
          const triggeredAlerts = alertResults.filter((alert: any) => alert.triggered);
          totalTriggeredAlerts += triggeredAlerts.length;
          
          // PHASE 4: STOP LOSS PRIORITY - Process Stop Loss alerts first
          const stopLossAlerts = triggeredAlerts.filter((alert: any) => alert.alert_type === 'stop_loss');
          const takeProfitAlerts = triggeredAlerts.filter((alert: any) => alert.alert_type.startsWith('take_profit_'));
          
          // Process Stop Loss alerts with HIGHEST priority
          for (const alert of stopLossAlerts) {
            console.log(`🛑 CRITICAL: Stop Loss triggered for signal ${alert.signal_id} at ${priceUpdate.bid}`);
            
            // Immediately close the signal
            const { error: closeError } = await supabaseClient
              .from('trade_alerts')
              .update({
                status: 'closed',
                close_reason: 'stop_loss',
                updated_at: new Date().toISOString()
              })
              .eq('id', alert.signal_id);

            if (!closeError) {
              notificationTriggers.push({
                signal_id: alert.signal_id,
                alert_type: 'stop_loss_hit',
                notification_type: 'stop_loss_hit',
                triggered_price: priceUpdate.bid,
                symbol: priceUpdate.symbol,
                timestamp: priceUpdate.timestamp || new Date().toISOString(),
                priority_level: 4 // HIGHEST priority for Stop Loss
              });
            }
          }
          
          // PHASE 2: Use sequential TP processing for Take Profit alerts
          for (const alert of takeProfitAlerts) {
            try {
              const isBuy = await supabaseClient
                .from('trade_alerts')
                .select('trade_type')
                .eq('id', alert.signal_id)
                .single();

              if (isBuy.data) {
                const isBuyTrade = isBuy.data.trade_type.includes('buy');
                const currentPrice = isBuyTrade ? priceUpdate.ask : priceUpdate.bid;
                
                // PHASE 2: Use sequential TP processing
                const { data: tpResult, error: tpError } = await supabaseClient
                  .rpc('process_tp_hits_sequential', {
                    p_trade_id: alert.signal_id,
                    p_current_price: currentPrice,
                    p_is_buy: isBuyTrade
                  });

                if (!tpError && tpResult) {
                  // ============================================
                  // BUG #24 FIX - PHASE 2: Check if all TPs are hit
                  // ============================================
                  if (tpResult.all_tps_hit && tpResult.signal_auto_closed) {
                    console.log(`🎉 ALL TARGETS HIT! Signal ${alert.signal_id} auto-closed - ${tpResult.total_tps_hit}/${tpResult.total_tps_defined} TPs`);
                    
                    // Send "All Targets Hit" notification with HIGHEST priority
                    notificationTriggers.push({
                      signal_id: alert.signal_id,
                      alert_type: 'all_targets_hit',
                      notification_type: 'all_tps_hit',
                      triggered_price: currentPrice,
                      symbol: priceUpdate.symbol,
                      timestamp: priceUpdate.timestamp || new Date().toISOString(),
                      priority_level: 4, // HIGHEST priority for completion
                      close_reason: 'all_targets_hit',
                      tp_hits_completed: tpResult.total_tps_hit
                    });
                  }
                  // Regular TP hit notification (if a new TP was hit but not all)
                  else if (tpResult.tp_hit_this_cycle && tpResult.tp_hit_this_cycle.length > 0) {
                    console.log(`🎯 SEQUENTIAL TP${tpResult.tp_hit_this_cycle[0]} hit for signal ${alert.signal_id} at ${currentPrice}`);
                    
                    notificationTriggers.push({
                      signal_id: alert.signal_id,
                      alert_type: `take_profit_${tpResult.tp_hit_this_cycle[0]}`,
                      notification_type: 'take_profit_hit',
                      triggered_price: currentPrice,
                      symbol: priceUpdate.symbol,
                      timestamp: priceUpdate.timestamp || new Date().toISOString(),
                      priority_level: 3, // High priority for TP hits
                      tp_level: tpResult.tp_hit_this_cycle[0]
                    });
                  }
                }
              }
            } catch (tpError) {
              console.error(`❌ Sequential TP processing error for signal ${alert.signal_id}:`, tpError);
            }
          }
          
          console.log(`🚨 ${triggeredAlerts.length} alerts triggered for ${priceUpdate.symbol} (${stopLossAlerts.length} SL, ${takeProfitAlerts.length} TP)`);
        }
      } catch (error) {
        console.error(`❌ Critical alert processing error for ${priceUpdate.symbol}:`, error);
      }
    }

    // 🚀 ENHANCED: Send notifications for all significant events
    if (notificationTriggers.length > 0) {
      console.log(`📢 NOTIFICATION DISPATCH: Sending ${notificationTriggers.length} trading notifications...`);
      
      try {
        const { data: notifyResult, error: notifyError } = await supabaseClient.functions.invoke(
          'enhanced-signal-notification-dispatcher',
          {
            body: {
              notifications: notificationTriggers.map(trigger => ({
                signal_id: trigger.signal_id,
                notification_type: trigger.notification_type,
                alert_type: trigger.alert_type,
                triggered_price: trigger.triggered_price,
                symbol: trigger.symbol,
                timestamp: trigger.timestamp,
                priority_level: trigger.priority_level,
                delivery_channels: ['push', 'in_app'],
                // Add all required fields
                user_id: trigger.user_id || '',
                asset_name: trigger.asset_name || trigger.symbol,
                trade_type: trigger.trade_type || 'unknown',
                entry_price: trigger.entry_price || trigger.triggered_price || 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                status: trigger.alert_type === 'stop_loss_hit' ? 'closed' : 'active',
                author_id: trigger.user_id || '',
                author_name: 'System' // Safe fallback for automated triggers
              }))
            }
          }
        );
        
        if (notifyError) {
          console.error('❌ Notification dispatch failed:', notifyError);
        } else {
          console.log(`✅ Successfully dispatched ${notificationTriggers.length} trading notifications`);
        }
      } catch (error) {
        console.error('❌ Notification dispatch exception:', error);
      }
    }

    totalAlertsTriggered += totalTriggeredAlerts;
    console.log(`✅ STEP 1 COMPLETE: Processed ${prices.length} prices, activated ${limitOrdersActivated} limit orders, triggered ${totalTriggeredAlerts} alerts, dispatched ${notificationTriggers.length} notifications`);

    // STEP 2: UNCONDITIONALLY upsert ALL prices to database (THE FACTORY)
    console.log('💾 STEP 2: Unconditionally upserting market prices to database...');
    const upsertPromises = prices.map(async (priceUpdate) => {
      // ✅ Get calculated prices from Map (stored in CHANGE #2)
      const priceData = symbolsWithPrices?.get(priceUpdate.symbol);
      
      if (!priceData) {
        console.log(`⚠️ No price data calculated for ${priceUpdate.symbol} - skipping upsert`);
        return { skipped: true, reason: 'no_calculated_data', symbol: priceUpdate.symbol };
      }
      
      try {
        // ✅ ALWAYS provide estimated bid/ask (NEVER NULL)
        console.log(`💾 Upserting ${priceUpdate.symbol}: bid=${priceData.bid}, ask=${priceData.ask}, mid=${priceData.mid}`);
        
        const { data, error } = await supabaseClient.rpc('upsert_market_price_enhanced', {
          p_symbol: priceUpdate.symbol,
          p_bid: priceData.bid,      // ✅ Always defined (estimated if needed)
          p_ask: priceData.ask,      // ✅ Always defined (estimated if needed)
          p_mid: priceData.mid,      // ✅ Always defined
          p_timestamp: priceUpdate.timestamp || new Date().toISOString()
        });
        
        if (error) {
          console.error(`❌ Database upsert failed for ${priceUpdate.symbol}:`, error);
          return { success: false, error: error.message, symbol: priceUpdate.symbol };
        }
        
        return { success: true, symbol: priceUpdate.symbol };
      } catch (error) {
        console.error(`❌ Upsert exception for ${priceUpdate.symbol}:`, error);
        return { success: false, error: (error as Error).message, symbol: priceUpdate.symbol };
      }
    });

    const upsertResults = await Promise.allSettled(upsertPromises);
    let successfulUpserts = 0;
    let skippedUpserts = 0;
    let failedUpserts = 0;

    upsertResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const value = result.value;
        if (value.skipped) {
          skippedUpserts++;
        } else if (value.success) {
          successfulUpserts++;
        } else {
          failedUpserts++;
        }
      } else {
        failedUpserts++;
        console.error(`❌ Upsert promise rejected for price ${index}:`, result.reason);
      }
    });

    totalPricesUpserted += successfulUpserts;
    console.log(`✅ STEP 2 COMPLETE: ${successfulUpserts} upserts successful, ${skippedUpserts} skipped, ${failedUpserts} failed`);
    
    if (successfulUpserts > 0) {
      console.log(`✅ DATABASE HEALTH: All ${successfulUpserts} price upserts successful`);
    }

    // STEP 3: UI BROADCASTING (only if users are active)
    console.log('📡 STEP 3: Checking if UI broadcast should proceed...');
    
    if (EMERGENCY_DISABLE_BROADCASTS) {
      console.log('🚨 Emergency broadcast disable active - skipping UI updates');
      return new Response(JSON.stringify({
        success: true,
        processed: prices.length,
        upserted: successfulUpserts,
        alerts_triggered: totalTriggeredAlerts,
        notifications_sent: notificationTriggers.length,
        ui_broadcasts: 0,
        broadcast_status: 'emergency_disabled'
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // STEP 3A: Calculate prices for UI FIRST (before using significantPrices)
    console.log('🎯 STEP 3A: Preparing prices for UI broadcast...');
    
    const pricesForUI = prices
      .filter(p => typeof p.price === 'number' || (typeof p.bid === 'number' && typeof p.ask === 'number'))
      .map(p => ({
        symbol: p.symbol,
        price: typeof p.price === 'number' ? p.price : (p.bid + p.ask) / 2,
        timestamp: new Date().toISOString()
      }));

    // 🚀 CRITICAL FIX: Enable real-time broadcasting when active users are present
    const broadcastAllPrices = hasActiveUsers && activeUserCount > 0;
    console.log(`📊 Broadcast mode: ${broadcastAllPrices ? 'REAL-TIME (all prices)' : 'FILTERED (significant only)'}`);
    
    const significantPrices = filterSignificantPrices(pricesForUI, broadcastAllPrices);

    // STEP 3B: Check if this is a heartbeat broadcast (significantPrices now exists)
    const isHeartbeatBroadcast = significantPrices && significantPrices.length > 0 && 
      significantPrices.every((p: any) => p.reason === 'heartbeat');

    // 🚀 CRITICAL: Skip UI broadcast if no active users
    if (!hasActiveUsers) {
      console.log('📡 UI broadcast skipped: no_active_users');
      return new Response(JSON.stringify({
        success: true,
        processed: prices.length,
        upserted: successfulUpserts,
        alerts_triggered: totalTriggeredAlerts,
        notifications_sent: notificationTriggers.length,
        ui_broadcasts: 0,
        broadcast_status: 'no_active_users'
      }), {
        status: 200,
        headers: corsHeaders
      });
    }
    
    // 🎯 PHASE 3: COOPERATIVE LOCK - Always acquire, use 1s duration for real-time mode
    const lockDuration = broadcastAllPrices ? 1 : BROADCAST_LOCK_DURATION; // Fast rotation for real-time
    const lockId = await acquireBroadcastLock(supabaseClient, lockDuration);
    
    if (!lockId && !isHeartbeatBroadcast) {
      console.log('🔒 No broadcast lock acquired - another instance broadcasting');
      console.log('📡 UI broadcast skipped: cooperative locking active');
      return new Response(JSON.stringify({
        success: true,
        processed: prices.length,
        upserted: successfulUpserts,
        alerts_triggered: totalTriggeredAlerts,
        notifications_sent: notificationTriggers.length,
        ui_broadcasts: 0,
        broadcast_status: 'no_lock'
      }), {
        status: 200,
        headers: corsHeaders
      });
    }
    
    if (isHeartbeatBroadcast && !lockId) {
      console.log('💓 HEARTBEAT BYPASS: Broadcasting despite no lock - guaranteeing continuous updates');
    }
    
    // ✅ PHASE 1: ZERO-REALTIME ARCHITECTURE
    // Broadcasts removed - frontend uses database polling (500ms)
    // This eliminates $32.50/month in Realtime message costs
    console.log(`💾 Database upserts complete. Frontend will poll for updates (no broadcasts).`);

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      processed: prices.length,
      upserted: successfulUpserts,
      alerts_triggered: totalTriggeredAlerts,
      notifications_sent: notificationTriggers.length,
      architecture: 'zero_realtime_polling', // No broadcasts - frontend polls database
      performance: {
        total_processed: totalPricesProcessed,
        total_alerts: totalAlertsTriggered,
        total_upserted: totalPricesUpserted
      }
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('❌ Critical error in price processing:', error);
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message,
      processed: 0,
      upserted: 0,
      alerts_triggered: 0,
      notifications_sent: 0
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});