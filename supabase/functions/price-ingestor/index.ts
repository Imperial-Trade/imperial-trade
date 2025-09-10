// IMPERIAL TRADING PRICE INGESTOR v3.0 - Complete Architecture Implementation
// Processes ALL business logic on raw data + broadcasts filtered UI updates
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Global connection reuse to prevent cold start issues
let supabaseClient: any = null;
let priceChannel: any = null;
let channelConnectionPromise: Promise<any> | null = null;

// Significance filtering configuration - reduces 85-90% of broadcasts
const MIN_PRICE_CHANGE_PERCENT = 0.015; // 0.015% for most assets (slightly increased for quality)
const MIN_PRICE_CHANGE_PIPS = 0.15; // 0.15 pips for Gold (slightly increased)
const GOLD_SYMBOLS = ['XAUUSD', 'XAUEUR', 'GOLD'];

// Per-symbol rate limiting and clamps (NEW: HARDENING)
const SYMBOL_RATE_LIMITS: Record<string, { maxPerSecond: number, lastBroadcast: number, clampCount: number }> = {};
const GLOBAL_BROADCAST_CLAMP = 50; // Max 50 broadcasts per batch
const PER_SYMBOL_CLAMP = 10; // Max 10 broadcasts per symbol per batch

// In-memory cache for last broadcasted prices (UI filtering only)
const lastBroadcastedPrices: Record<string, number> = {};

// Telemetry tracking
let totalPricesProcessed = 0;
let totalAlertsTriggered = 0;
let totalPricesUpserted = 0;
let totalUIBroadcasts = 0;
let totalClampActivations = 0;

// Phase 1: Enhanced timeout configuration
const CHANNEL_SUBSCRIPTION_TIMEOUT = 15000; // Increased from 5000ms to 15000ms

// Phase 1: Initialize Supabase client and channel only once per warm instance
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

  // Phase 1: Reuse existing channel connection if available
  if (!priceChannel || priceChannel.state === 'CLOSED') {
    console.log('📡 Creating new Realtime channel...');
    priceChannel = supabaseClient.channel('live-prices-broadcast');
    
    // Phase 1: Enhanced channel subscription with longer timeout
    if (!channelConnectionPromise) {
      channelConnectionPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          channelConnectionPromise = null;
          reject(new Error(`Channel subscription timeout after ${CHANNEL_SUBSCRIPTION_TIMEOUT / 1000} seconds`));
        }, CHANNEL_SUBSCRIPTION_TIMEOUT);

        priceChannel.subscribe((status: string) => {
          console.log(`📡 Channel status: ${status}`);
          clearTimeout(timeout);
          channelConnectionPromise = null;
          
          if (status === 'SUBSCRIBED') {
            resolve(status);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            reject(new Error(`Channel failed to subscribe: ${status}`));
          }
          // Other statuses (JOINING, etc.) are handled by the timeout
        });
      });
    }
    
    await channelConnectionPromise;
    console.log('✅ Realtime channel connected successfully');
  }

  return { supabaseClient, priceChannel };
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

    // Initialize connection (reuse if warm)
    const { supabaseClient, priceChannel } = await initializeSupabase();

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

    // STEP 2: Asynchronously upsert latest prices (non-blocking, full data only)
    console.log('💾 STEP 2: Asynchronously upserting market prices...');
    const upsertPromises = prices.map(async (priceUpdate) => {
      const hasFullData = typeof priceUpdate.bid === 'number' && typeof priceUpdate.ask === 'number';
      
      if (!priceUpdate.symbol || !hasFullData) {
        if (typeof priceUpdate.price === 'number') {
          console.log(`📊 Upsert skipped for mid-only price: ${priceUpdate.symbol}`);
        }
        return { skipped: true, reason: 'mid_only_or_invalid' };
      }

      try {
        const mid = (priceUpdate.bid + priceUpdate.ask) / 2;
        await supabaseClient.rpc('upsert_market_price_enhanced', {
          p_symbol: priceUpdate.symbol,
          p_bid: priceUpdate.bid,
          p_ask: priceUpdate.ask,
          p_mid: mid,
          p_timestamp: priceUpdate.timestamp || new Date().toISOString()
        });
        return { upserted: true };
      } catch (error) {
        console.error(`❌ Price upsert error for ${priceUpdate.symbol}:`, error);
        return { error: true };
      }
    });

    // Don't wait for upserts to complete - they're async by design
    Promise.all(upsertPromises).then(results => {
      const upserted = results.filter((r: any) => r.upserted).length;
      const skipped = results.filter((r: any) => r.skipped).length;
      totalPricesUpserted += upserted;
      console.log(`💾 STEP 2 COMPLETE: ${upserted}/${prices.length} prices upserted (${skipped} mid-only skipped)`);
    });

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
    
    const filteredPrices = filterSignificantPrices(uiPrices);
    
    // APPLY GLOBAL AND PER-SYMBOL CLAMPS
    let clampedPrices = filteredPrices;
    let clampActivated = false;
    
    // Global clamp
    if (filteredPrices.length > GLOBAL_BROADCAST_CLAMP) {
      clampedPrices = filteredPrices.slice(0, GLOBAL_BROADCAST_CLAMP);
      clampActivated = true;
      totalClampActivations++;
      console.warn(`🛑 GLOBAL CLAMP: Limiting ${filteredPrices.length} → ${GLOBAL_BROADCAST_CLAMP} broadcasts`);
    }
    
    // Per-symbol clamp
    const symbolCounts: Record<string, number> = {};
    clampedPrices = clampedPrices.filter(price => {
      symbolCounts[price.symbol] = (symbolCounts[price.symbol] || 0) + 1;
      if (symbolCounts[price.symbol] > PER_SYMBOL_CLAMP) {
        if (symbolCounts[price.symbol] === PER_SYMBOL_CLAMP + 1) { // Log only once per symbol
          console.warn(`🛑 SYMBOL CLAMP: ${price.symbol} limited to ${PER_SYMBOL_CLAMP} broadcasts`);
          clampActivated = true;
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
        clamp_activated: clampActivated
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
      await supabaseClient.from('realtime_telemetry').insert({
        scope: 'edge',
        channel: 'price_update',
        metric: 'ingestor_batch',
        count: successfulBroadcasts,
        metadata: {
          processed: prices.length,
          valid: uiPrices.length,
          filtered: filteredPrices.length,
          broadcasted: successfulBroadcasts,
          clamped_symbol: clampActivated ? totalClampActivations : 0,
          clamped_batch: clampActivated ? 1 : 0,
          alerts_triggered: totalTriggeredAlerts
        }
      });
    } catch (telemetryError) {
      console.warn('⚠️ Telemetry logging failed:', telemetryError);
    }

    // COMPREHENSIVE SUCCESS RESPONSE
    const responseMessage = `IMPERIAL TRADING v3.0: Processed ${prices.length} prices → Triggered ${totalTriggeredAlerts} alerts → ${successfulBroadcasts} UI broadcasts ${clampActivated ? '(CLAMPED)' : ''}`;
    console.log(`✅ COMPLETE: ${responseMessage}`);
    console.log(`📊 SESSION TOTALS: Processed: ${totalPricesProcessed}, Alerts: ${totalAlertsTriggered}, Upserts: ${totalPricesUpserted}, UI: ${totalUIBroadcasts}, Clamps: ${totalClampActivations}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: responseMessage,
      processed: prices.length,
      alerts_triggered: totalTriggeredAlerts,
      ui_significant: clampedPrices.length,
      ui_broadcasted: successfulBroadcasts,
      efficiency: `${Math.round((prices.length - clampedPrices.length) / prices.length * 100)}% UI filtered`,
      clamp_activated: clampActivated,
      clamp_activations: totalClampActivations,
      session_totals: {
        processed: totalPricesProcessed,
        alerts_triggered: totalAlertsTriggered,
        prices_upserted: totalPricesUpserted,
        ui_broadcasts: totalUIBroadcasts,
        clamp_activations: totalClampActivations
      },
      version: '3.0-hybrid-architecture'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('❌ Price ingestor error:', error);
    
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
