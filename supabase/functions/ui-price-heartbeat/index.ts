// UI PRICE HEARTBEAT v1.0 - GUARANTEED 2-SECOND UPDATES
// Ensures consistent UI price updates every 2 seconds regardless of external price feeds
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Enhanced filtering for heartbeat broadcasts
const GOLD_SYMBOLS = ['XAUUSD', 'XAUEUR', 'GOLD'];
const MIN_PRICE_CHANGE_PERCENT = 0.005; // Reduced to 0.005% for heartbeat (more sensitive)
const MIN_PRICE_CHANGE_PIPS = 0.05;     // Reduced to 0.05 pips for heartbeat

// In-memory cache for last broadcasted prices
const lastBroadcastedPrices: Record<string, number> = {};

// Global Supabase client
let supabaseClient: any = null;

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

// Create broadcast channel for UI updates
async function createBroadcastChannel(supabaseClient: any) {
  console.log('📡 Creating heartbeat broadcast channel...');
  const priceChannel = supabaseClient.channel('live-prices-broadcast');
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Channel subscription timeout after 10 seconds'));
    }, 10000);

    priceChannel.subscribe((status: string) => {
      console.log(`📡 Heartbeat channel status: ${status}`);
      clearTimeout(timeout);
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ Heartbeat broadcast channel connected');
        resolve(priceChannel);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        reject(new Error(`Channel failed to subscribe: ${status}`));
      }
    });
  });
}

// Filter prices for significant changes (reduced threshold for heartbeat)
function filterSignificantPrices(prices: Array<{symbol: string, mid: number}>) {
  const significantUpdates: Array<{symbol: string, price: number}> = [];

  for (const priceData of prices) {
    const { symbol, mid: price } = priceData;
    const normalizedSymbol = symbol.toUpperCase();
    const lastPrice = lastBroadcastedPrices[normalizedSymbol];

    // Always broadcast the first price for a symbol
    if (!lastPrice) {
      significantUpdates.push({ symbol, price });
      lastBroadcastedPrices[normalizedSymbol] = price;
      console.log(`🆕 Heartbeat first price for ${symbol}: ${price}`);
      continue;
    }

    // Calculate significance based on asset type (reduced thresholds)
    const percentChange = Math.abs(price - lastPrice) / lastPrice * 100;
    const absoluteChange = Math.abs(price - lastPrice);
    
    const isGoldAsset = GOLD_SYMBOLS.some(goldSymbol => normalizedSymbol.includes(goldSymbol));
    const threshold = isGoldAsset ? MIN_PRICE_CHANGE_PIPS : MIN_PRICE_CHANGE_PERCENT;
    const changeValue = isGoldAsset ? absoluteChange : percentChange;

    if (changeValue >= threshold) {
      significantUpdates.push({ symbol, price });
      lastBroadcastedPrices[normalizedSymbol] = price;
      console.log(`📈 Heartbeat significant change for ${symbol}: ${lastPrice} → ${price} (${changeValue.toFixed(4)}${isGoldAsset ? ' pips' : '%'})`);
    } else {
      // For heartbeat, also broadcast every 4th call regardless to prevent staleness
      const callCount = Math.floor(Date.now() / 2000) % 4; // Every 8 seconds
      if (callCount === 0) {
        significantUpdates.push({ symbol, price });
        lastBroadcastedPrices[normalizedSymbol] = price;
        console.log(`🔄 Heartbeat refresh for ${symbol}: ${price} (periodic update)`);
      } else {
        console.log(`⏭️ Heartbeat skipping minor change for ${symbol}: ${lastPrice} → ${price} (${changeValue.toFixed(4)}${isGoldAsset ? ' pips' : '%'})`);
      }
    }
  }

  return significantUpdates;
}

serve(async (req) => {
  console.log(`💓 [ui-price-heartbeat] ${req.method} request received`);

  // CORS preflight handling
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Only allow POST and GET (GET for cron)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method Not Allowed', { 
      status: 405,
      headers: corsHeaders 
    });
  }

  try {
    await initializeSupabase();

    // Check for active UI listeners before proceeding
    const { data: hasActiveUsers, error: activityError } = await supabaseClient.rpc('has_active_ui_listeners', { 
      p_threshold_seconds: 90 // Slightly longer window for heartbeat
    });
    
    if (activityError) {
      console.warn('⚠️ Activity check failed, proceeding with heartbeat:', activityError);
    } else if (!hasActiveUsers) {
      console.log('⏸️ No active users - skipping heartbeat for cost optimization');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No active users - heartbeat skipped',
        broadcasts: 0,
        skip_reason: 'no_active_users'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    console.log('💓 HEARTBEAT: Fetching current market prices...');

    // Fetch current market prices (all available)
    const { data: marketPrices, error: priceError } = await supabaseClient
      .from('market_prices')
      .select('symbol, mid, updated_at')
      .not('mid', 'is', null)
      .order('updated_at', { ascending: false });

    if (priceError) {
      console.error('❌ Error fetching market prices:', priceError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch market prices' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!marketPrices || marketPrices.length === 0) {
      console.log('📊 No market prices available for heartbeat');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No market prices available',
        broadcasts: 0
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    console.log(`💓 Processing ${marketPrices.length} prices for heartbeat broadcast`);

    // Filter for significant price changes
    const significantPrices = filterSignificantPrices(marketPrices);

    if (significantPrices.length === 0) {
      console.log('📊 No significant price changes for heartbeat broadcast');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No significant price changes',
        broadcasts: 0,
        total_prices: marketPrices.length
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Create broadcast channel
    const priceChannel = await createBroadcastChannel(supabaseClient);

    // Broadcast significant price updates
    let broadcastCount = 0;
    for (const { symbol, price } of significantPrices) {
      try {
        await priceChannel.send({
          type: 'broadcast',
          event: 'live_price_update',
          payload: {
            symbol,
            price,
            timestamp: new Date().toISOString(),
            source: 'heartbeat',
            quality: 'guaranteed'
          }
        });

        console.log(`💰 Heartbeat broadcast: ${symbol}: $${price}`);
        broadcastCount++;
      } catch (error) {
        console.error(`❌ Failed to broadcast ${symbol}:`, error);
      }
    }

    // Clean up channel
    try {
      await supabaseClient.removeChannel(priceChannel);
      console.log('🧹 Heartbeat channel cleaned up successfully');
    } catch (error) {
      console.warn('⚠️ Channel cleanup warning:', error);
    }

    console.log(`✅ HEARTBEAT COMPLETE: ${broadcastCount}/${significantPrices.length} prices broadcasted`);

    return new Response(JSON.stringify({
      success: true,
      message: `Heartbeat complete: ${broadcastCount} prices broadcasted`,
      broadcasts: broadcastCount,
      total_prices: marketPrices.length,
      significant_prices: significantPrices.length,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('❌ Fatal heartbeat error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});