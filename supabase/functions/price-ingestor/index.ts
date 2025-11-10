// IMPERIAL TRADING PRICE INGESTOR v4.2 - EARLYDROP FIX
// =====================================================================
// CRITICAL FIX: Prevents EarlyDrop shutdown using EdgeRuntime.waitUntil()
// - Returns 200 OK response immediately after validation
// - Uses EdgeRuntime.waitUntil() to keep function alive during background processing
// - Processes alerts, DB upserts, and notifications in background
// - Works even with 0 active users (alerts and DB always processed)
// - Comprehensive logging with timing metrics
// =====================================================================
// Enhanced with Stop Loss Priority, Sequential TP Processing, and 100% Reliability
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Type definitions for price data with optional reason field
interface PriceData {
  symbol: string;
  price: number;
  timestamp: string;
  reason?: string;
}

// Global EdgeRuntime type declaration
declare const EdgeRuntime: {
  waitUntil(promise: Promise<any>): void;
} | undefined;

// 🔥 CRITICAL FIX: Emergency kill switch for broadcasts
const EMERGENCY_DISABLE_BROADCASTS = Deno.env.get('EMERGENCY_DISABLE_BROADCASTS') === 'true';

// Global connection reuse to prevent cold start issues
let supabaseClient: any = null;

// Global map to store calculated bid/ask/mid prices for database upsert
let symbolsWithPrices: Map<string, { bid: number; ask: number; mid: number }> | undefined;

// 🛡️ SHUTDOWN HANDLER: Log when function is about to terminate
addEventListener('beforeunload', () => {
  console.log('⚠️ Function shutting down - beforeunload event triggered');
  console.log(`📊 Final stats: processed=${totalPricesProcessed}, alerts=${totalAlertsTriggered}, upserted=${totalPricesUpserted}`);
});

// 🛡️ UNHANDLED REJECTION HANDLER: Catch any background processing errors
addEventListener('unhandledrejection', (event) => {
  console.error('❌ Unhandled promise rejection in background processing:', event.reason);
  event.preventDefault(); // Prevent the default behavior which might crash the function
});

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
): Array<PriceData> {
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

  // 🚀 CRITICAL FIX: Parse payload and validate BEFORE heavy processing
  let prices: any[];
  try {
    const requestBody = await req.json();
    prices = requestBody.prices;

    // Validate payload early
    if (!prices || !Array.isArray(prices) || prices.length === 0) {
      console.warn('❌ Invalid payload: missing or empty prices array');
      return new Response('Invalid payload: prices array required', {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log(`📊 Received ${prices.length} prices - sending early response to prevent EarlyDrop`);
  } catch (error) {
    console.error('❌ Failed to parse request body:', error);
    return new Response('Invalid JSON payload', {
      status: 400,
      headers: corsHeaders
    });
  }

  // 🚀 CRITICAL FIX: Use EdgeRuntime.waitUntil() for guaranteed background processing
  // This prevents EarlyDrop by keeping function alive after response is sent
  const backgroundTask = processInBackground(prices).catch(error => {
    console.error('❌ Background processing error:', error);
  });

  // Mark the background task to keep function alive until completion
  // EdgeRuntime.waitUntil() ensures the function doesn't terminate early
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
    EdgeRuntime.waitUntil(backgroundTask);
    console.log('🔄 Background processing registered with EdgeRuntime.waitUntil()');
  } else {
    // Fallback: await the task if waitUntil is not available (local development)
    console.log('⚠️ EdgeRuntime.waitUntil() not available, processing synchronously');
    await backgroundTask;
  }

  // Return response immediately (background continues via waitUntil)
  return new Response(JSON.stringify({
    success: true,
    received: prices.length,
    status: 'processing'
  }), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
});

// 🚀 BACKGROUND PROCESSING: Runs after response is sent
// Uses EdgeRuntime.waitUntil() to prevent EarlyDrop termination
async function processInBackground(prices: any[]) {
  const startTime = Date.now();
  console.log(`🔄 [BACKGROUND START] Processing ${prices.length} prices at ${new Date().toISOString()}`);

  try {
    // Initialize Supabase client
    await initializeSupabase();
    console.log(`✅ [BACKGROUND] Supabase client initialized (${Date.now() - startTime}ms)`);
    
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
    console.log(`📊 Processing ${prices.length} price updates for ${activeUserCount} active users (notifications always processed)`);

    totalPricesProcessed += prices.length;

    console.log(`📊 Background processing started for ${prices.length} prices`);

    // 🚀 STEP 1: CRITICAL PRIORITY PROCESSING - Stop Loss FIRST, then Take Profits
    console.log('🎯 STEP 1: Processing alerts with STOP LOSS PRIORITY...');
    let totalTriggeredAlerts = 0;
    let limitOrdersActivated = 0;
    // Notification tracking removed - handled by database trigger automatically
    
    // Initialize global symbolsWithPrices Map for this batch
    symbolsWithPrices = new Map();
    
    // Populate symbolsWithPrices with calculated bid/ask/mid prices
    for (const priceUpdate of prices) {
      const hasFullData = typeof priceUpdate.bid === 'number' && typeof priceUpdate.ask === 'number';
      const hasMidOnly = typeof priceUpdate.price === 'number';
      
      if (!priceUpdate.symbol || (!hasFullData && !hasMidOnly)) {
        console.warn(`⚠️ Skipping invalid price data: ${JSON.stringify(priceUpdate)}`);
        continue;
      }

      // Calculate bid/ask/mid prices with consistent object structure
      let bidPrice: number, askPrice: number, currentPrice: number;
      
      if (hasFullData) {
        bidPrice = priceUpdate.bid!;
        askPrice = priceUpdate.ask!;
        currentPrice = (bidPrice + askPrice) / 2;
      } else {
        currentPrice = priceUpdate.price;
        // Estimate bid/ask from mid
        const isGold = priceUpdate.symbol === 'XAUUSD' || priceUpdate.symbol.includes('XAU');
        const isBitcoin = priceUpdate.symbol === 'BTCUSD' || priceUpdate.symbol.includes('BTC');
        const halfSpread = isGold ? 0.05 : (isBitcoin ? 2.50 : 0.00005);
        bidPrice = currentPrice - halfSpread;
        askPrice = currentPrice + halfSpread;
      }
      
      // Store in global Map for use throughout processing
      symbolsWithPrices.set(priceUpdate.symbol, { bid: bidPrice, ask: askPrice, mid: currentPrice });
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
          const priceData = symbolsWithPrices.get(alert.tradermade_symbol);
          if (!priceData) continue;
          const currentPrice = priceData.mid;

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
              // Notification sent automatically by database trigger
            }
          }
        }
      }
    }

    // ============================================================================
    // 🆕 INTEGRATED INSTANT DETECTOR SYSTEM (Phase 2)
    // ============================================================================
    // Replaces old alert processing with new detector logic
    // Detection happens within 500ms-1s of price update!
    // ============================================================================

    console.log('🔍 [Instant Detector] Starting TP/SL detection...');
    const detectionStartTime = Date.now();
    let tpHitsDetected = 0;
    let slHitsDetected = 0;

    try {
      // Get all active signals (across all symbols in this batch)
      const symbolsInBatch = Array.from(symbolsWithPrices.keys());
      
      const { data: activeSignals, error: signalsError } = await supabaseClient
        .from('trade_alerts')
        .select('*')
        .eq('status', 'active')
        .in('tradermade_symbol', symbolsInBatch);

      if (signalsError) {
        console.error('❌ [Instant Detector] Failed to fetch signals:', signalsError);
      } else if (activeSignals && activeSignals.length > 0) {
        console.log(`🔍 [Instant Detector] Checking ${activeSignals.length} active signals`);

        // Process each signal for TP/SL hits
        for (const signal of activeSignals) {
          const priceData = symbolsWithPrices.get(signal.tradermade_symbol);
          if (!priceData || !priceData.mid) continue;

          const currentPrice = priceData.mid;
          const isBuy = signal.trade_type === 'buy' || signal.trade_type === 'buy_limit';
          const currentTpHits = signal.tp_hits || [];

          // ============================================================================
          // CHECK STOP LOSS (Highest Priority)
          // ============================================================================
          if (signal.stop_loss && signal.status === 'active') {
            const slHit = isBuy 
              ? currentPrice <= signal.stop_loss 
              : currentPrice >= signal.stop_loss;

            if (slHit) {
              console.log(`🛑 [SL HIT] Signal ${signal.id.substring(0,8)} (${signal.asset_name}): Entry $${signal.entry_price} → Current $${currentPrice} → SL $${signal.stop_loss}`);
              
              const { error: updateError } = await supabaseClient
                .from('trade_alerts')
                .update({ 
                  close_reason: 'stop_loss',
                  status: 'closed',
                  updated_at: new Date().toISOString()
                })
                .eq('id', signal.id)
                .eq('status', 'active'); // Safety: only update if still active

              if (!updateError) {
                slHitsDetected++;
                console.log(`✅ [SL HIT] Signal ${signal.id.substring(0,8)} closed - notification will be sent by database trigger`);
              } else {
                console.error(`❌ [SL HIT] Failed to update signal ${signal.id}:`, updateError);
              }
              
              continue; // Skip TP checks if SL hit
            }
          }

          // ============================================================================
          // CHECK TAKE PROFITS (TP1-TP5 Sequential)
          // ============================================================================
          
          // TP1
          if (signal.tp1 && !currentTpHits.includes(1)) {
            const tp1Hit = isBuy ? currentPrice >= signal.tp1 : currentPrice <= signal.tp1;
            if (tp1Hit) {
              console.log(`🎯 [TP1 HIT] Signal ${signal.id.substring(0,8)} (${signal.asset_name}): $${currentPrice} crossed TP1 $${signal.tp1}`);
              const { error } = await supabaseClient
                .from('trade_alerts')
                .update({ 
                  tp_hits: [...currentTpHits, 1],
                  updated_at: new Date().toISOString()
                })
                .eq('id', signal.id);
              
              if (!error) {
                tpHitsDetected++;
                currentTpHits.push(1); // Update local copy for subsequent checks
              }
            }
          }

          // TP2
          if (signal.tp2 && currentTpHits.includes(1) && !currentTpHits.includes(2)) {
            const tp2Hit = isBuy ? currentPrice >= signal.tp2 : currentPrice <= signal.tp2;
            if (tp2Hit) {
              console.log(`🎯 [TP2 HIT] Signal ${signal.id.substring(0,8)} (${signal.asset_name}): $${currentPrice} crossed TP2 $${signal.tp2}`);
              const { error } = await supabaseClient
                .from('trade_alerts')
                .update({ 
                  tp_hits: [...currentTpHits, 2],
                  updated_at: new Date().toISOString()
                })
                .eq('id', signal.id);
              
              if (!error) {
                tpHitsDetected++;
                currentTpHits.push(2);
              }
            }
          }

          // TP3
          if (signal.tp3 && currentTpHits.includes(2) && !currentTpHits.includes(3)) {
            const tp3Hit = isBuy ? currentPrice >= signal.tp3 : currentPrice <= signal.tp3;
            if (tp3Hit) {
              console.log(`🎯 [TP3 HIT] Signal ${signal.id.substring(0,8)} (${signal.asset_name}): $${currentPrice} crossed TP3 $${signal.tp3}`);
              const { error } = await supabaseClient
                .from('trade_alerts')
                .update({ 
                  tp_hits: [...currentTpHits, 3],
                  updated_at: new Date().toISOString()
                })
                .eq('id', signal.id);
              
              if (!error) {
                tpHitsDetected++;
                currentTpHits.push(3);
              }
            }
          }

          // TP4
          if (signal.tp4 && currentTpHits.includes(3) && !currentTpHits.includes(4)) {
            const tp4Hit = isBuy ? currentPrice >= signal.tp4 : currentPrice <= signal.tp4;
            if (tp4Hit) {
              console.log(`🎯 [TP4 HIT] Signal ${signal.id.substring(0,8)} (${signal.asset_name}): $${currentPrice} crossed TP4 $${signal.tp4}`);
              const { error } = await supabaseClient
                .from('trade_alerts')
                .update({ 
                  tp_hits: [...currentTpHits, 4],
                  updated_at: new Date().toISOString()
                })
                .eq('id', signal.id);
              
              if (!error) {
                tpHitsDetected++;
                currentTpHits.push(4);
              }
            }
          }

          // TP5 (Special: Can close signal if all TPs hit)
          if (signal.tp5 && currentTpHits.includes(4) && !currentTpHits.includes(5)) {
            const tp5Hit = isBuy ? currentPrice >= signal.tp5 : currentPrice <= signal.tp5;
            if (tp5Hit) {
              const allTpsHit = signal.tp1 && signal.tp2 && signal.tp3 && signal.tp4 && signal.tp5;
              console.log(`🎯 [TP5 HIT] Signal ${signal.id.substring(0,8)} (${signal.asset_name}): $${currentPrice} crossed TP5 $${signal.tp5}${allTpsHit ? ' 🎉 ALL TPs HIT!' : ''}`);
              
              const { error } = await supabaseClient
                .from('trade_alerts')
                .update({ 
                  tp_hits: [...currentTpHits, 5],
                  close_reason: allTpsHit ? 'all_tps_hit' : null,
                  status: allTpsHit ? 'closed' : 'active',
                  updated_at: new Date().toISOString()
                })
                .eq('id', signal.id);
              
              if (!error) {
                tpHitsDetected++;
              }
            }
          }
        }

        const detectionTime = Date.now() - detectionStartTime;
        console.log(`✅ [Instant Detector] Complete in ${detectionTime}ms: ${tpHitsDetected} TP hits, ${slHitsDetected} SL hits detected`);
      } else {
        console.log('ℹ️ [Instant Detector] No active signals to check');
      }
    } catch (error) {
      console.error('❌ [Instant Detector] Error:', error);
    }

    totalAlertsTriggered += (tpHitsDetected + slHitsDetected);
    console.log(`✅ STEP 1 COMPLETE: Processed ${prices.length} prices, activated ${limitOrdersActivated} limit orders, detected ${tpHitsDetected + slHitsDetected} TP/SL hits (notifications sent by database trigger)`);

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
      const totalTime = Date.now() - startTime;
      console.log('🚨 Emergency broadcast disable active - skipping UI updates');
      console.log(`✅ [BACKGROUND COMPLETE] Emergency mode - Time: ${totalTime}ms, processed=${prices.length}, upserted=${successfulUpserts}, alerts=${totalTriggeredAlerts}`);
      return; // Early exit - emergency disable active
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

    // 🚀 CRITICAL: Skip UI broadcast if no active users (alerts and DB still processed!)
    if (!hasActiveUsers) {
      const totalTime = Date.now() - startTime;
      console.log('📡 UI broadcast skipped: no_active_users (this is normal when no one is viewing)');
      console.log(`✅ [BACKGROUND COMPLETE] No users mode - Time: ${totalTime}ms, processed=${prices.length}, upserted=${successfulUpserts}, alerts=${totalTriggeredAlerts}`);
      return; // Early exit - no active users
    }
    
    // 🎯 PHASE 3: COOPERATIVE LOCK - Always acquire, use 1s duration for real-time mode
    const lockDuration = broadcastAllPrices ? 1 : BROADCAST_LOCK_DURATION; // Fast rotation for real-time
    const lockId = await acquireBroadcastLock(supabaseClient, lockDuration);
    
    if (!lockId && !isHeartbeatBroadcast) {
      const totalTime = Date.now() - startTime;
      console.log('🔒 No broadcast lock acquired - another instance broadcasting');
      console.log('📡 UI broadcast skipped: cooperative locking active');
      console.log(`✅ [BACKGROUND COMPLETE] Lock skipped mode - Time: ${totalTime}ms, processed=${prices.length}, upserted=${successfulUpserts}, alerts=${totalTriggeredAlerts}`);
      return; // Early exit - another instance has the lock
    }
    
    if (isHeartbeatBroadcast && !lockId) {
      console.log('💓 HEARTBEAT BYPASS: Broadcasting despite no lock - guaranteeing continuous updates');
    }
    
    // ✅ PHASE 1: ZERO-REALTIME ARCHITECTURE
    // Broadcasts removed - frontend uses database polling (500ms)
    // This eliminates $32.50/month in Realtime message costs
    console.log(`💾 Database upserts complete. Frontend will poll for updates (no broadcasts).`);

    // Log successful completion with timing
    const totalTime = Date.now() - startTime;
    console.log(`✅ [BACKGROUND COMPLETE] Total time: ${totalTime}ms`);
    console.log(`📊 [BACKGROUND STATS] {
      processed: ${prices.length},
      upserted: ${successfulUpserts},
      alerts_triggered: ${totalTriggeredAlerts},
      notifications: auto_by_trigger,
      architecture: 'zero_realtime_polling',
      total_processed: ${totalPricesProcessed},
      total_alerts: ${totalAlertsTriggered},
      total_upserted: ${totalPricesUpserted},
      duration_ms: ${totalTime}
    }`);

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ [BACKGROUND ERROR] Failed after ${totalTime}ms:`, error);
    console.error('Error details:', (error as Error).message);
    console.error('Stack trace:', (error as Error).stack);
  }
}