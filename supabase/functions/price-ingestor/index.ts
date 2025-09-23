// IMPERIAL TRADING PRICE INGESTOR v4.0 - STRATEGIC ARCHITECTURAL REFINEMENT
// The "Factory": Database as source of truth, unconditional upserts, conditional broadcasting
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// 🔥 CRITICAL FIX: Emergency kill switch for broadcasts
const EMERGENCY_DISABLE_BROADCASTS = Deno.env.get('EMERGENCY_DISABLE_BROADCASTS') === 'true';

// Global connection reuse to prevent cold start issues
let supabaseClient: any = null;

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

// Telemetry tracking
let totalPricesProcessed = 0;
let totalAlertsTriggered = 0;
let totalPricesUpserted = 0;
let totalUIBroadcasts = 0;
let totalClampActivations = 0;

// 🔒 SIMPLIFIED LOCK CONFIGURATION  
const CHANNEL_SUBSCRIPTION_TIMEOUT = 15000;
const BROADCAST_LOCK_DURATION = 5; // Reduced from 25 to 5 seconds for cooperation

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

// 🔥 SIMPLIFIED: Create static channel for UI broadcasts
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

// 🔒 COOPERATIVE LOCK: Acquire broadcast lock with reduced duration
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
      console.log(`🔒 Acquired broadcast lock: ${holderId} (${BROADCAST_LOCK_DURATION}s)`);
      return holderId;
    }
    return null;
  } catch (error) {
    console.error('❌ Error acquiring broadcast lock:', error);
    return null;
  }
}

// Phase 1: Price significance filtering function (UI only)
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
  console.log(`🔄 [price-ingestor-v4] ${req.method} request received`);

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
    // 🚀 ACTIVITY-BASED GATING: Check if any UI listeners are active before processing
    await initializeSupabase();
    const { data: hasActiveUsers, error: activityError } = await supabaseClient.rpc('has_active_ui_listeners', { 
      p_threshold_seconds: 60 // Check for UI activity in last 60 seconds
    });
    
    if (activityError) {
      console.warn('⚠️ Activity check failed, proceeding with processing:', activityError);
    } else if (!hasActiveUsers) {
      console.log('⏸️ No active users - skipping price processing for cost optimization');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No active users - processing skipped',
        processed: 0,
        skip_reason: 'no_active_users'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

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

    console.log(`📊 Processing ${prices.length} price update(s) for ${hasActiveUsers ? 'active' : 'inactive'} users`);
    totalPricesProcessed += prices.length;

    // Initialize Supabase client
    await initializeSupabase();

    // 🚀 STEP 3: Enhanced alert processing with notification detection
    console.log('🎯 STEP 3: Processing alerts and detecting notification triggers...');
    let totalTriggeredAlerts = 0;
    let notificationTriggers: any[] = [];
    
    for (const priceUpdate of prices) {
      const hasFullData = typeof priceUpdate.bid === 'number' && typeof priceUpdate.ask === 'number';
      const hasMidOnly = typeof priceUpdate.price === 'number';
      
      if (!priceUpdate.symbol || (!hasFullData && !hasMidOnly)) {
        console.warn(`⚠️ Skipping invalid price data: ${JSON.stringify(priceUpdate)}`);
        continue;
      }

      // Skip alert processing for mid-only prices (they're UI-only)
      if (!hasFullData) {
        console.log(`📊 Mid-only price for ${priceUpdate.symbol}: ${priceUpdate.price} (alerts skipped)`);
        continue;
      }

      // Enhanced NaN validation for full data
      if (!isFinite(priceUpdate.bid) || !isFinite(priceUpdate.ask) ||
          priceUpdate.bid <= 0 || priceUpdate.ask <= 0 ||
          isNaN(priceUpdate.bid) || isNaN(priceUpdate.ask)) {
        console.warn(`⚠️ Skipping invalid bid/ask data: ${JSON.stringify(priceUpdate)}`);
        continue;
      }

      try {
        // Process alerts with enhanced notification detection
        const { data: alertResults, error: alertError } = await supabaseClient
          .rpc('process_price_alerts_enhanced', {
            p_symbol: priceUpdate.symbol,
            p_current_bid: priceUpdate.bid,
            p_current_ask: priceUpdate.ask
          });

        if (alertError) {
          console.error(`❌ Alert processing error for ${priceUpdate.symbol}:`, alertError);
        } else if (alertResults && alertResults.length > 0) {
          const triggeredAlerts = alertResults.filter((alert: any) => alert.triggered);
          totalTriggeredAlerts += triggeredAlerts.length;
          
          // 🚀 NEW: Detect notification-worthy events
          for (const alert of triggeredAlerts) {
            if (alert.alert_type === 'stop_loss' || alert.alert_type.startsWith('take_profit_')) {
              notificationTriggers.push({
                signal_id: alert.signal_id,
                alert_type: alert.alert_type,
                triggered_price: alert.alert_type === 'stop_loss' ? priceUpdate.bid : priceUpdate.ask,
                symbol: priceUpdate.symbol,
                timestamp: priceUpdate.timestamp || new Date().toISOString()
              });
            }
          }
          
          console.log(`🚨 ${triggeredAlerts.length} alerts triggered for ${priceUpdate.symbol}`);
        }
      } catch (error) {
        console.error(`❌ Critical alert processing error for ${priceUpdate.symbol}:`, error);
      }
    }

    // 🚀 NEW: Send enhanced notifications for significant events
    if (notificationTriggers.length > 0) {
      console.log(`📢 NOTIFICATION DISPATCH: Sending ${notificationTriggers.length} trading notifications...`);
      
      try {
        const { data: notifyResult, error: notifyError } = await supabaseClient.functions.invoke(
          'enhanced-signal-notification-dispatcher',
          {
            body: {
              notifications: notificationTriggers.map(trigger => ({
                signal_id: trigger.signal_id,
                notification_type: trigger.alert_type === 'stop_loss' ? 'stop_loss_hit' : 'take_profit_hit',
                alert_type: trigger.alert_type,
                triggered_price: trigger.triggered_price,
                symbol: trigger.symbol,
                timestamp: trigger.timestamp,
                priority_level: trigger.alert_type === 'stop_loss' ? 3 : 2, // Higher priority for SL
                delivery_channels: ['push', 'in_app']
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
    console.log(`✅ STEP 3 COMPLETE: Processed ${prices.length} prices, triggered ${totalTriggeredAlerts} alerts, dispatched ${notificationTriggers.length} notifications`);

    // STEP 2: UNCONDITIONALLY upsert ALL prices to database (THE FACTORY)
    console.log('💾 STEP 2: Unconditionally upserting market prices to database...');
    const upsertPromises = prices.map(async (priceUpdate) => {
      const hasFullData = typeof priceUpdate.bid === 'number' && typeof priceUpdate.ask === 'number';
      const hasMidOnly = typeof priceUpdate.price === 'number' && !hasFullData;
      
      if (!priceUpdate.symbol || (!hasFullData && !hasMidOnly)) {
        console.log(`📊 Upsert skipped for invalid price: ${priceUpdate.symbol}`);
        return { skipped: true, reason: 'invalid_data', symbol: priceUpdate.symbol };
      }

      try {
        if (hasFullData) {
          // Full bid/ask data available
          const mid = (priceUpdate.bid + priceUpdate.ask) / 2;
          console.log(`💾 Upserting ${priceUpdate.symbol}: bid=${priceUpdate.bid}, ask=${priceUpdate.ask}, mid=${mid}`);
          
          const { data, error } = await supabaseClient.rpc('upsert_market_price_enhanced', {
            p_symbol: priceUpdate.symbol,
            p_bid: priceUpdate.bid,
            p_ask: priceUpdate.ask,
            p_mid: mid,
            p_timestamp: priceUpdate.timestamp || new Date().toISOString()
          });
          
          if (error) {
            console.error(`❌ Database upsert failed for ${priceUpdate.symbol}:`, error);
            return { success: false, error: error.message, symbol: priceUpdate.symbol };
          }
          
          return { success: true, symbol: priceUpdate.symbol, type: 'full_data' };
        } else {
          // Mid-only data from Digital Ocean WebSocket
          console.log(`💾 Upserting mid-only ${priceUpdate.symbol}: mid=${priceUpdate.price}`);
          
          const { data, error } = await supabaseClient.rpc('upsert_market_price_enhanced', {
            p_symbol: priceUpdate.symbol,
            p_bid: null,
            p_ask: null,
            p_mid: priceUpdate.price,
            p_timestamp: priceUpdate.timestamp || new Date().toISOString()
          });
          
          if (error) {
            console.error(`❌ Database upsert failed for ${priceUpdate.symbol}:`, error);
            return { success: false, error: error.message, symbol: priceUpdate.symbol };
          }
          
          return { success: true, symbol: priceUpdate.symbol, type: 'mid_only' };
        }
      } catch (error) {
        console.error(`❌ Database upsert exception for ${priceUpdate.symbol}:`, error);
        return { success: false, symbol: priceUpdate.symbol, error: error.message };
      }
    });

    // Wait for upserts to complete to ensure data integrity
    const upsertResults = await Promise.all(upsertPromises);
    const successfulUpserts = upsertResults.filter((r: any) => r.success).length;
    const skippedUpserts = upsertResults.filter((r: any) => r.skipped).length;
    const failedUpserts = upsertResults.filter((r: any) => !r.success && !r.skipped).length;

    totalPricesUpserted += successfulUpserts;
    console.log(`✅ STEP 2 COMPLETE: ${successfulUpserts} upserts successful, ${skippedUpserts} skipped, ${failedUpserts} failed`);

    if (failedUpserts > 0) {
      console.warn(`⚠️ DATABASE HEALTH: ${failedUpserts} price upserts failed out of ${prices.length}`);
    } else {
      console.log(`✅ DATABASE HEALTH: All ${successfulUpserts} price upserts successful`);
    }

    // STEP 3: CONDITIONAL UI Broadcasting (removed heartbeat dependency)
    console.log('📡 STEP 3: Checking if UI broadcast should proceed...');
    let skipBroadcast = false;
    let lockHolder: string | null = null;
    let skipReason = '';
    
    // Step 3.1: Check emergency disable flag
    if (EMERGENCY_DISABLE_BROADCASTS) {
      console.log('🚨 EMERGENCY MODE: Broadcasts disabled');
      skipBroadcast = true;
      skipReason = 'emergency_mode';
    }
    
    // Step 3.2: Acquire cooperative broadcast lock 
    if (!skipBroadcast) {
      lockHolder = await acquireBroadcastLock(supabaseClient);
      if (!lockHolder) {
        console.log('🔒 No broadcast lock acquired - another instance broadcasting');
        skipBroadcast = true;
        skipReason = 'no_broadcast_lock';
      }
    }
    
    // If no broadcasts needed, return early with success
    if (skipBroadcast) {
      console.log(`📡 UI broadcast skipped: ${skipReason}`);
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: `Processed ${prices.length} prices → ${totalTriggeredAlerts} alerts → ${successfulUpserts} DB upserts → UI broadcasts skipped (${skipReason})`,
        processed: prices.length,
        alerts_triggered: totalTriggeredAlerts,
        db_upserts: successfulUpserts,
        ui_broadcasts: 0,
        skip_reason: skipReason
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // STEP 3.3: Create fresh channel and proceed with UI broadcasting
    const priceChannel = await createBroadcastChannel(supabaseClient);

    // STEP 4: Filter significant prices for UI broadcasting
    console.log('🎯 STEP 4: Filtering significant prices for UI broadcast...');
    const uiPrices = prices.map(p => ({
      symbol: p.symbol,
      price: typeof p.price === 'number' ? p.price : (p.bid + p.ask) / 2,
      timestamp: p.timestamp || new Date().toISOString()
    }));
    
    const significantPrices = filterSignificantPrices(uiPrices);
    
    // Apply rate limiting and clamps
    let finalBroadcastPrices = significantPrices.slice(0, MAX_UI_BROADCASTS_PER_BATCH);
    let clampedCount = significantPrices.length - finalBroadcastPrices.length;
    
    if (clampedCount > 0) {
      totalClampActivations += clampedCount;
      console.log(`🔒 Rate limit: Clamped ${clampedCount} prices, broadcasting ${finalBroadcastPrices.length}`);
    }

    // STEP 5: Broadcast filtered prices to UI
    let broadcastCount = 0;
    for (const priceData of finalBroadcastPrices) {
      try {
        await priceChannel.send({
          type: 'broadcast',
          event: 'price_update_v3',
          payload: {
            symbol: priceData.symbol,
            price: priceData.price,
            change: 0,
            changePercent: 0,
            ts: priceData.timestamp
          }
        });
        
        console.log(`💰 UI Broadcast: ${priceData.symbol}: $${priceData.price}`);
        broadcastCount++;
      } catch (broadcastError) {
        console.error(`❌ Broadcast failed for ${priceData.symbol}:`, broadcastError);
      }
    }
    
    totalUIBroadcasts += broadcastCount;
    console.log(`📈 STEP 4 COMPLETE: ${broadcastCount}/${finalBroadcastPrices.length} UI updates broadcasted (${significantPrices.length - finalBroadcastPrices.length} filtered/clamped out)`);

    // Cleanup
    try {
      console.log(`📡 Channel status: ${priceChannel.state}`);
      supabaseClient.removeChannel(priceChannel);
      console.log('🧹 Channel cleaned up successfully');
    } catch (cleanupError) {
      console.warn('⚠️ Channel cleanup error:', cleanupError);
    }

    // Final telemetry and success response
    console.log(`📊 SESSION TOTALS: Processed: ${totalPricesProcessed}, Alerts: ${totalAlertsTriggered}, Upserts: ${totalPricesUpserted}, UI: ${totalUIBroadcasts}, Clamps: ${totalClampActivations}`);
    
    const responseMessage = `✅ COMPLETE: IMPERIAL TRADING v4.0: Processed ${prices.length} prices → Triggered ${totalTriggeredAlerts} alerts → ${successfulUpserts} DB upserts → ${broadcastCount} UI broadcasts`;
    console.log(responseMessage);

    return new Response(JSON.stringify({
      success: true,
      message: responseMessage,
      processed: prices.length,
      alerts_triggered: totalTriggeredAlerts,
      db_upserts: successfulUpserts,
      ui_broadcasts: broadcastCount,
      session_totals: {
        processed: totalPricesProcessed,
        alerts: totalAlertsTriggered,
        upserts: totalPricesUpserted,
        ui_broadcasts: totalUIBroadcasts,
        clamps: totalClampActivations
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('💥 Critical error in price ingestor:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});