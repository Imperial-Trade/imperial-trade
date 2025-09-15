// IMPERIAL TRADING PRICE INGESTOR v3.1 - REALTIME LEAK FIXED
// Processes ALL business logic + broadcasts ONLY when listeners are active
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// 🔥 CRITICAL FIX: Emergency kill switch for broadcasts
const EMERGENCY_DISABLE_BROADCASTS = Deno.env.get('EMERGENCY_DISABLE_BROADCASTS') === 'true';

// Global connection reuse to prevent cold start issues
let supabaseClient: any = null;

// 🎯 ENHANCED SIGNIFICANCE THRESHOLDS - Higher quality, less noise
const MIN_PRICE_CHANGE_PERCENT = 0.08; // Increased from 0.015% to 0.08% (5x reduction)
const MIN_PRICE_CHANGE_PIPS = 0.8; // Increased from 0.15 to 0.8 pips for Gold (5x reduction)
const GOLD_SYMBOLS = ['XAUUSD', 'XAUEUR', 'GOLD'];

// 🔒 GLOBAL RATE LIMITING - Dramatically reduced for quality
const SYMBOL_RATE_LIMITS: Record<string, { lastBroadcasts: number[], clampCount: number }> = {};
const MAX_SYMBOL_UI_BROADCASTS_PER_SECOND = 0.5; // Reduced from 2 to 0.5 (75% reduction)
const MAX_UI_BROADCASTS_PER_BATCH = 50;
const PER_SYMBOL_CLAMP = 10; // Max 10 broadcasts per symbol per batch

// In-memory cache for last broadcasted prices (UI filtering only)
const lastBroadcastedPrices: Record<string, number> = {};

// Telemetry tracking
let totalPricesProcessed = 0;
let totalAlertsTriggered = 0;
let totalPricesUpserted = 0;
let totalUIBroadcasts = 0;
let totalClampActivations = 0;

// 🔒 GLOBAL LOCK & HEARTBEAT CONFIGURATION  
const CHANNEL_SUBSCRIPTION_TIMEOUT = 15000; // Increased from 5000ms to 15000ms
const HEARTBEAT_THRESHOLD_SECONDS = 120; // UI listeners must be seen within 120s
const BROADCAST_LOCK_DURATION = 25; // Lock duration in seconds

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

// 🔥 CRITICAL FIX: Create static channel that matches frontend listener
async function createBroadcastChannel(supabaseClient: any) {
  console.log('📡 Creating new Realtime channel...');
  console.log('🎯 Broadcasting to channel: live-prices-broadcast');
  const priceChannel = supabaseClient.channel('live-prices-broadcast');
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Channel subscription timeout after ${CHANNEL_SUBSCRIPTION_TIMEOUT / 1000} seconds`));
    }, CHANNEL_SUBSCRIPTION_TIMEOUT);

    priceChannel.subscribe((status: string) => {
      console.log(`📡 Channel status: ${status}`);
      clearTimeout(timeout);
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime channel connected successfully');
        resolve(priceChannel);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        reject(new Error(`Channel failed to subscribe: ${status}`));
      }
    });
  });
}

// 🔥 CRITICAL FIX: Check if there are active listeners before broadcasting  
async function hasActiveListeners(supabaseClient: any): Promise<boolean> {
  try {
    // Check for active frontend connections via the realtime health monitor
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('account_status', 'active')
      .limit(1);
    
    if (error) {
      console.warn('⚠️ Listener check failed, defaulting to broadcast:', error);
      return true; // Fail open to prevent missing real users
    }
    
    const hasActiveUsers = data && data.length > 0;
    console.log(`👥 Active listener check: ${hasActiveUsers ? 'Found active users' : 'No active users'}`);
    return hasActiveUsers;
  } catch (error) {
    console.warn('⚠️ Listener check error, defaulting to broadcast:', error);
    return true; // Fail open
  }
}

// 🔥 ENHANCED: Check for active UI listeners via heartbeat system
async function hasActiveUIListeners(supabaseClient: any): Promise<boolean> {
  try {
    const { data, error } = await supabaseClient.rpc('has_active_ui_listeners', { 
      p_threshold_seconds: HEARTBEAT_THRESHOLD_SECONDS 
    });
    
    if (error) {
      console.warn('⚠️ UI heartbeat check failed, defaulting to broadcast:', error);
      return true; // Fail open to prevent missing real users
    }
    
    return data || false;
  } catch (error) {
    console.error('❌ Error checking UI listeners:', error);
    return false; // Fail safe: assume no listeners to prevent broadcasts
  }
}

// 🔒 GLOBAL LOCK: Acquire broadcast lock to prevent multiple instances broadcasting
async function acquireBroadcastLock(supabaseClient: any): Promise<string | null> {
  try {
    const holderId = `price-ingestor-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const { data, error } = await supabaseClient.rpc('acquire_broadcast_lock', {
      p_holder_id: holderId,
      p_duration_seconds: BROADCAST_LOCK_DURATION
    });
    
    if (error) {
      console.warn('⚠️ Lock acquisition failed:', error);
      return null;
    }
    
    if (data) {
      console.log(`🔒 Acquired broadcast lock: ${holderId}`);
      return holderId;
    }
    return null;
  } catch (error) {
    console.error('❌ Error acquiring broadcast lock:', error);
    return null; // Fail safe: no lock acquired
  }
}

// Phase 1: Price significance filtering function
function filterSignificantPrices(incomingPrices: Array<{symbol: string, price: number, timestamp: string}>) {
  const significantUpdates: Array<{symbol: string, price: number, timestamp: string}> = [];

  for (const priceData of incomingPrices) {
    const { symbol, price } = priceData;
    const normalizedSymbol = symbol.toUpperCase();
    const lastPrice = lastBroadcastedPrices[normalizedSymbol];

    // Always broadcast the first price for a symbol
    if (!lastPrice) {
      significantUpdates.push(priceData);
      lastBroadcastedPrices[normalizedSymbol] = price;
      console.log(`🆕 First price for ${symbol}: ${price}`);
      continue;
    }

    // Calculate significance based on asset type
    const percentChange = Math.abs(price - lastPrice) / lastPrice * 100;
    const absoluteChange = Math.abs(price - lastPrice);
    
    const isGoldAsset = GOLD_SYMBOLS.some(goldSymbol => normalizedSymbol.includes(goldSymbol));
    const threshold = isGoldAsset ? MIN_PRICE_CHANGE_PIPS : MIN_PRICE_CHANGE_PERCENT;
    const changeValue = isGoldAsset ? absoluteChange : percentChange;

    if (changeValue >= threshold) {
      significantUpdates.push(priceData);
      lastBroadcastedPrices[normalizedSymbol] = price;
      console.log(`📈 Significant change for ${symbol}: ${lastPrice} → ${price} (${changeValue.toFixed(4)}${isGoldAsset ? ' pips' : '%'})`);
    } else {
      console.log(`⏭️ Skipping minor change for ${symbol}: ${lastPrice} → ${price} (${changeValue.toFixed(4)}${isGoldAsset ? ' pips' : '%'})`);
    }
  }

  return significantUpdates;
}

serve(async (req) => {
  console.log(`🔄 [price-ingestor-v2] ${req.method} request received`);

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
    // Parse request payload
    const requestBody = await req.json();
    const { prices } = requestBody;

    // Validate payload
    if (!prices || !Array.isArray(prices) || prices.length === 0) {
      console.warn('❌ Invalid payload: missing or empty prices array');
      return new Response('Invalid payload: prices array required', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    console.log(`📊 Processing ${prices.length} price update(s)`);
    totalPricesProcessed += prices.length;

    // Initialize Supabase client
    const supabaseClient = await initializeSupabase();

    // 🔥 CRITICAL FIX: Emergency kill switch check
    if (EMERGENCY_DISABLE_BROADCASTS) {
      console.log('🚨 EMERGENCY MODE: Broadcasts disabled, processing business logic only');
      
      // Still process alerts but skip UI broadcasts entirely
      let totalTriggeredAlerts = 0;
      for (const priceUpdate of prices) {
        const hasFullData = typeof priceUpdate.bid === 'number' && typeof priceUpdate.ask === 'number';
        if (!priceUpdate.symbol || !hasFullData) continue;
        
        try {
          const { data: triggeredAlerts } = await supabaseClient
            .rpc('process_price_alerts_enhanced', {
              p_symbol: priceUpdate.symbol,
              p_current_bid: priceUpdate.bid,
              p_current_ask: priceUpdate.ask
            });
          
          if (triggeredAlerts && triggeredAlerts.length > 0) {
            totalTriggeredAlerts += triggeredAlerts.filter((alert: any) => alert.triggered).length;
          }
        } catch (error) {
          console.error(`❌ Alert processing error for ${priceUpdate.symbol}:`, error);
        }
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: `EMERGENCY MODE: Processed ${prices.length} prices, triggered ${totalTriggeredAlerts} alerts, broadcasts DISABLED`,
        emergency_mode: true,
        processed: prices.length,
        alerts_triggered: totalTriggeredAlerts,
        ui_broadcasts: 0
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // 🔥 ENHANCED LISTENER GATING SYSTEM
    let skipBroadcast = false;
    let lockHolder: string | null = null;
    
    // Step 1: Check emergency disable flag
    if (EMERGENCY_DISABLE_BROADCASTS) {
      console.log('🚨 EMERGENCY MODE: Broadcasts disabled, processing alerts only');
      skipBroadcast = true;
    }
    
    // Step 2: Acquire global broadcast lock (prevents multi-instance broadcasting)
    if (!skipBroadcast) {
      lockHolder = await acquireBroadcastLock(supabaseClient);
      if (!lockHolder) {
        console.log('🔒 No broadcast lock acquired - another instance is broadcasting');
        skipBroadcast = true;
      }
    }
    
    // Step 3: Check for active UI listeners via heartbeat system
    if (!skipBroadcast) {
      const hasListeners = await hasActiveUIListeners(supabaseClient);
      if (!hasListeners) {
        console.log('👥 No active UI listeners detected via heartbeat system - skipping broadcasts');
        skipBroadcast = true;
      } else {
        console.log('👥 Active UI listeners detected - broadcasts will proceed');
      }
    }
    
    // If no broadcasts needed, process alerts only and exit early
    if (skipBroadcast) {
      console.log('📡 No active listeners detected - skipping UI broadcast pipeline');
      
      // Still process alerts for business logic
      let totalTriggeredAlerts = 0;
      for (const priceUpdate of prices) {
        const hasFullData = typeof priceUpdate.bid === 'number' && typeof priceUpdate.ask === 'number';
        if (!priceUpdate.symbol || !hasFullData) continue;
        
        try {
          const { data: triggeredAlerts } = await supabaseClient
            .rpc('process_price_alerts_enhanced', {
              p_symbol: priceUpdate.symbol,
              p_current_bid: priceUpdate.bid,
              p_current_ask: priceUpdate.ask
            });
          
          if (triggeredAlerts && triggeredAlerts.length > 0) {
            totalTriggeredAlerts += triggeredAlerts.filter((alert: any) => alert.triggered).length;
          }
        } catch (error) {
          console.error(`❌ Alert processing error for ${priceUpdate.symbol}:`, error);
        }
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: `No active listeners: Processed ${prices.length} prices, triggered ${totalTriggeredAlerts} alerts, skipped UI broadcasts`,
        no_listeners: true,
        processed: prices.length,
        alerts_triggered: totalTriggeredAlerts,
        ui_broadcasts: 0
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // 🔥 CRITICAL FIX: Create fresh channel for this invocation only
    const priceChannel = await createBroadcastChannel(supabaseClient);

    // STEP 1: Process ALL price ticks for business logic (alerts, limit orders, etc.)
    console.log('🎯 STEP 1: Processing ALL alerts on raw price data...');
    let totalTriggeredAlerts = 0;
    
    for (const priceUpdate of prices) {
      // PHASE A: Accept dual payload formats (full vs mid-only)
      const hasFullData = typeof priceUpdate.bid === 'number' && typeof priceUpdate.ask === 'number';
      const hasMidOnly = typeof priceUpdate.price === 'number';
      
      if (!priceUpdate.symbol || (!hasFullData && !hasMidOnly)) {
        console.warn(`⚠️ Skipping invalid price data (no symbol or price): ${JSON.stringify(priceUpdate)}`);
        continue;
      }

      // Skip alert processing for mid-only prices (they're UI-only)
      if (!hasFullData) {
        console.log(`📊 Mid-only price for ${priceUpdate.symbol}: ${priceUpdate.price} (alerts skipped)`);
        continue;
      }

      // ENHANCED NaN VALIDATION for full data
      if (!isFinite(priceUpdate.bid) || !isFinite(priceUpdate.ask) ||
          priceUpdate.bid <= 0 || priceUpdate.ask <= 0 ||
          isNaN(priceUpdate.bid) || isNaN(priceUpdate.ask)) {
        console.warn(`⚠️ Skipping invalid bid/ask data: ${JSON.stringify(priceUpdate)}`);
        continue;
      }

      try {
        // Call enhanced alert processing with bid/ask precision
        const { data: triggeredAlerts, error: alertError } = await supabaseClient
          .rpc('process_price_alerts_enhanced', {
            p_symbol: priceUpdate.symbol,
            p_current_bid: priceUpdate.bid,
            p_current_ask: priceUpdate.ask
          });

        if (alertError) {
          console.error(`❌ Alert processing error for ${priceUpdate.symbol}:`, alertError);
        } else if (triggeredAlerts && triggeredAlerts.length > 0) {
          const triggeredCount = triggeredAlerts.filter((alert: any) => alert.triggered).length;
          totalTriggeredAlerts += triggeredCount;
          console.log(`🚨 ${triggeredCount} alerts triggered for ${priceUpdate.symbol}`);
        }
      } catch (error) {
        console.error(`❌ Critical alert processing error for ${priceUpdate.symbol}:`, error);
      }
    }

    totalAlertsTriggered += totalTriggeredAlerts;
    console.log(`✅ STEP 1 COMPLETE: Processed ${prices.length} prices, triggered ${totalTriggeredAlerts} alerts`);

    // STEP 2: Synchronously upsert latest prices (blocking to ensure data integrity)
    console.log('💾 STEP 2: Upserting market prices to database...');
    const upsertPromises = prices.map(async (priceUpdate) => {
      const hasFullData = typeof priceUpdate.bid === 'number' && typeof priceUpdate.ask === 'number';
      
      if (!priceUpdate.symbol || !hasFullData) {
        if (typeof priceUpdate.price === 'number') {
          console.log(`📊 Upsert skipped for mid-only price: ${priceUpdate.symbol}`);
        }
        return { skipped: true, reason: 'mid_only_or_invalid', symbol: priceUpdate.symbol };
      }

      try {
        const mid = (priceUpdate.bid + priceUpdate.ask) / 2;
        console.log(`💾 Upserting ${priceUpdate.symbol}: bid=${priceUpdate.bid}, ask=${priceUpdate.ask}, mid=${mid}`);
        
        const { data, error } = await supabaseClient.rpc('upsert_market_price', {
          p_symbol: priceUpdate.symbol,
          p_bid: priceUpdate.bid,
          p_ask: priceUpdate.ask,
          p_mid: mid,
          p_timestamp: priceUpdate.timestamp || new Date().toISOString()
        });
        
        if (error) {
          console.error(`❌ Database upsert failed for ${priceUpdate.symbol}:`, error);
          return { error: true, symbol: priceUpdate.symbol, errorDetails: error };
        }
        
        console.log(`✅ Successfully upserted ${priceUpdate.symbol}`);
        return { upserted: true, symbol: priceUpdate.symbol };
      } catch (error) {
        console.error(`❌ Price upsert exception for ${priceUpdate.symbol}:`, error);
        return { error: true, symbol: priceUpdate.symbol, errorDetails: error };
      }
    });

    // Wait for upserts to complete to ensure data integrity
    const upsertResults = await Promise.all(upsertPromises);
    const upserted = upsertResults.filter((r: any) => r.upserted).length;
    const skipped = upsertResults.filter((r: any) => r.skipped).length;
    const failed = upsertResults.filter((r: any) => r.error).length;
    
    totalPricesUpserted += upserted;
    
    console.log(`💾 STEP 2 COMPLETE: ${upserted}/${prices.length} prices upserted (${skipped} mid-only skipped, ${failed} failed)`);
    
    // Log any failures for debugging
    if (failed > 0) {
      const failedSymbols = upsertResults.filter((r: any) => r.error).map((r: any) => r.symbol);
      console.error(`❌ Failed upserts for symbols: ${failedSymbols.join(', ')}`);
    }

    // STEP 3: Apply significance filtering + CLAMPS for UI broadcasts only
    console.log('📡 STEP 3: Filtering significant changes for UI broadcast...');
    // PHASE A: Handle both full and mid-only prices for UI
    const uiPrices = prices
      .filter(p => {
        const hasFullData = p.symbol && typeof p.bid === 'number' && typeof p.ask === 'number';
        const hasMidOnly = p.symbol && typeof p.price === 'number';
        return hasFullData || hasMidOnly;
      })
      .map(p => {
        // Handle mid-only format
        if (typeof p.price === 'number' && (!p.bid || !p.ask)) {
          if (!isFinite(p.price) || isNaN(p.price) || p.price <= 0) {
            console.warn(`⚠️ Invalid mid-only price for ${p.symbol}: ${p.price}`);
            return null;
          }
          return { 
            symbol: p.symbol, 
            price: p.price, 
            timestamp: p.timestamp || new Date().toISOString() 
          };
        }
        
        // Handle full bid/ask format
        if (p.bid > 0 && p.ask > 0 && isFinite(p.bid) && isFinite(p.ask)) {
          const mid = (p.bid + p.ask) / 2;
          if (!isFinite(mid) || isNaN(mid) || mid <= 0) {
            console.warn(`⚠️ Calculated invalid mid price for ${p.symbol}: bid=${p.bid}, ask=${p.ask}`);
            return null;
          }
          return { 
            symbol: p.symbol, 
            price: mid, 
            timestamp: p.timestamp || new Date().toISOString() 
          };
        }
        
        return null;
      })
      .filter(Boolean) as Array<{symbol: string, price: number, timestamp: string}>;
    
    // CRITICAL: Capture snapshot BEFORE filtering for batch clamp ranking
    const prevPricesSnapshot = { ...lastBroadcastedPrices };
    
    const filteredPrices = filterSignificantPrices(uiPrices);
    
    // APPLY PER-SECOND PER-SYMBOL RATE LIMITING
    const currentTime = Date.now();
    const symbolClampCounts: Record<string, number> = {};
    
    const rateLimitedPrices = filteredPrices.filter(price => {
      const symbol = price.symbol.toUpperCase();
      
      // Initialize symbol rate tracking
      if (!SYMBOL_RATE_LIMITS[symbol]) {
        SYMBOL_RATE_LIMITS[symbol] = { lastBroadcasts: [], clampCount: 0 };
      }
      
      const symbolLimits = SYMBOL_RATE_LIMITS[symbol];
      
      // Clean old timestamps (older than 1 second)
      symbolLimits.lastBroadcasts = symbolLimits.lastBroadcasts.filter(
        timestamp => currentTime - timestamp < 1000
      );
      
      // Check if under rate limit
      if (symbolLimits.lastBroadcasts.length >= MAX_SYMBOL_UI_BROADCASTS_PER_SECOND) {
        symbolLimits.clampCount++;
        symbolClampCounts[symbol] = (symbolClampCounts[symbol] || 0) + 1;
        return false; // Rate limited
      }
      
      // Add current timestamp
      symbolLimits.lastBroadcasts.push(currentTime);
      return true;
    });
    
    // Log per-symbol rate limit clamps
    let perSymbolClampActivated = false;
    for (const [symbol, count] of Object.entries(symbolClampCounts)) {
      console.log(`🛑 SYMBOL_RATE_LIMIT (2/sec) clamped for ${symbol} (count=${count})`);
      perSymbolClampActivated = true;
      totalClampActivations++;
    }
    
    // APPLY BATCH CLAMP WITH RANKING  
    let clampedPrices = rateLimitedPrices;
    let batchClampActivated = false;
    let perSymbolFinalClampActivated = false; // Initialize the missing variable
    
    if (rateLimitedPrices.length > MAX_UI_BROADCASTS_PER_BATCH) {
      // Sort by absolute delta vs SNAPSHOT (not mutated lastBroadcastedPrices)
      const rankedPrices = rateLimitedPrices.sort((a, b) => {
        const deltaA = Math.abs(a.price - (prevPricesSnapshot[a.symbol.toUpperCase()] || a.price));
        const deltaB = Math.abs(b.price - (prevPricesSnapshot[b.symbol.toUpperCase()] || b.price));
        return deltaB - deltaA; // Descending order - largest changes first
      });
      
      clampedPrices = rankedPrices.slice(0, MAX_UI_BROADCASTS_PER_BATCH);
      batchClampActivated = true;
      totalClampActivations++;
      
      const kept = clampedPrices.length;
      const dropped = rateLimitedPrices.length - kept;
      console.log(`🛑 clamped_batch kept=${kept} dropped=${dropped}`);
    }
    
    // Per-symbol clamp (final step)
    const symbolCounts: Record<string, number> = {};
    clampedPrices = clampedPrices.filter(price => {
      symbolCounts[price.symbol] = (symbolCounts[price.symbol] || 0) + 1;
      if (symbolCounts[price.symbol] > PER_SYMBOL_CLAMP) {
        if (symbolCounts[price.symbol] === PER_SYMBOL_CLAMP + 1) { // Log only once per symbol
          console.warn(`🛑 SYMBOL CLAMP: ${price.symbol} limited to ${PER_SYMBOL_CLAMP} broadcasts`);
          perSymbolFinalClampActivated = true;
          totalClampActivations++;
        }
        return false;
      }
      return true;
    });
    
    if (clampedPrices.length === 0) {
      console.log('✅ STEP 3 COMPLETE: No significant UI changes - skipping broadcast');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Business logic processed, no UI updates needed',
        processed: prices.length,
        alerts_triggered: totalTriggeredAlerts,
        ui_broadcasts: 0,
        efficiency: `${Math.round((prices.length - clampedPrices.length) / prices.length * 100)}% UI filtered`,
        clamp_activated: perSymbolClampActivated || batchClampActivated || perSymbolFinalClampActivated
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // STEP 4: Broadcast only significant UI updates to Realtime
    console.log('📡 STEP 4: Broadcasting significant UI updates...');
    let successfulBroadcasts = 0;
    const broadcastPromises = clampedPrices.map(async (price, index) => {
      try {
        // Validate price structure
        if (!price.symbol || typeof price.price !== 'number' || price.price <= 0) {
          console.warn(`⚠️ Skipping invalid price at index ${index}:`, price);
          return false;
        }

        const broadcastResult = await priceChannel.send({
          type: 'broadcast',
          event: 'price_update',
          payload: {
            symbol: price.symbol,
            price: price.price,
            ts: price.timestamp,
          },
        });

        if (broadcastResult === 'ok') {
          console.log(`💰 UI Broadcast: ${price.symbol}: $${price.price.toFixed(5)}`);
          return true;
        } else {
          console.warn(`⚠️ UI Broadcast failed for ${price.symbol}:`, broadcastResult);
          return false;
        }
      } catch (error) {
        console.error(`❌ Error broadcasting UI update at index ${index}:`, error);
        return false;
      }
    });

    const results = await Promise.all(broadcastPromises);
    successfulBroadcasts = results.filter(Boolean).length;
    totalUIBroadcasts += successfulBroadcasts;

    console.log(`📈 STEP 4 COMPLETE: ${successfulBroadcasts}/${clampedPrices.length} UI updates broadcasted (${prices.length - clampedPrices.length} filtered/clamped out)`);

    // PHASE C: Record telemetry to permanent table
    try {
      await supabaseClient.from('edge_function_telemetry').insert({
        function_name: 'price-ingestor',
        metric: 'ingestor_batch',
        count: successfulBroadcasts,
        metadata: {
          processed: prices.length,
          valid: uiPrices.length,
          filtered: filteredPrices.length,
          broadcasted: successfulBroadcasts,
          clamped_symbol_total: perSymbolClampActivated ? Object.values(symbolClampCounts).reduce((a, b) => a + b, 0) : 0,
          clamped_batch: batchClampActivated ? (rateLimitedPrices.length - MAX_UI_BROADCASTS_PER_BATCH) : 0,
          per_symbol_clamps: symbolClampCounts,
          alerts_triggered: totalTriggeredAlerts
        },
        batch_id: `batch_${Date.now()}`
      });
    } catch (telemetryError) {
      console.warn('⚠️ Telemetry logging failed:', telemetryError);
    }

    // COMPREHENSIVE SUCCESS RESPONSE  
    const anyClampActivated = perSymbolClampActivated || batchClampActivated || perSymbolFinalClampActivated;
    const responseMessage = `IMPERIAL TRADING v3.0: Processed ${prices.length} prices → Triggered ${totalTriggeredAlerts} alerts → ${upserted} DB upserts → ${successfulBroadcasts} UI broadcasts ${anyClampActivated ? '(CLAMPED)' : ''}`;
    console.log(`✅ COMPLETE: ${responseMessage}`);
    console.log(`📊 SESSION TOTALS: Processed: ${totalPricesProcessed}, Alerts: ${totalAlertsTriggered}, Upserts: ${totalPricesUpserted}, UI: ${totalUIBroadcasts}, Clamps: ${totalClampActivations}`);
    
    // Enhanced logging for debugging
    if (failed > 0) {
      console.error(`❌ DATABASE ISSUES: ${failed} upsert failures detected - this will cause live prices not to display!`);
    } else {
      console.log(`✅ DATABASE HEALTH: All ${upserted} price upserts successful`);
    }

    // 🔥 CRITICAL FIX: Always cleanup the channel after broadcasting
    try {
      await priceChannel.unsubscribe();
      console.log('🧹 Channel cleaned up successfully');
    } catch (cleanupError) {
      console.warn('⚠️ Channel cleanup warning:', cleanupError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: responseMessage,
      processed: prices.length,
      alerts_triggered: totalTriggeredAlerts,
      database_upserts: {
        successful: upserted,
        failed: failed,
        skipped: skipped,
        total_attempted: prices.length
      },
      ui_significant: clampedPrices.length,
      ui_broadcasted: successfulBroadcasts,
      efficiency: `${Math.round((prices.length - clampedPrices.length) / prices.length * 100)}% UI filtered`,
      clamp_activated: anyClampActivated,
      clamp_activations: totalClampActivations,
      session_totals: {
        processed: totalPricesProcessed,
        alerts_triggered: totalAlertsTriggered,
        prices_upserted: totalPricesUpserted,
        ui_broadcasts: totalUIBroadcasts,
        clamp_activations: totalClampActivations
      },
      version: '3.1-db-fixed'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('❌ Price ingestor error:', error);
    
    // 🔥 CRITICAL FIX: Ensure cleanup even on errors
    try {
      if (typeof priceChannel !== 'undefined' && priceChannel?.unsubscribe) {
        await priceChannel.unsubscribe();
        console.log('🧹 Emergency channel cleanup completed');
      }
    } catch (cleanupError) {
      console.warn('⚠️ Emergency cleanup failed:', cleanupError);
    }
    
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});
