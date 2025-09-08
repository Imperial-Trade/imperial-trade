// Phase 1: Enhanced Price Ingestor with Connection Reuse & Significance Filtering
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Phase 1: Global connection reuse to prevent cold start issues
let supabaseClient: any = null;
let priceChannel: any = null;
let channelConnectionPromise: Promise<any> | null = null;

// Phase 1: Significance filtering configuration - reduces 90% of broadcasts
const MIN_PRICE_CHANGE_PERCENT = 0.01; // 0.01% for most assets
const MIN_PRICE_CHANGE_PIPS = 0.1; // 0.1 pips for Gold
const GOLD_SYMBOLS = ['XAUUSD', 'XAUEUR', 'GOLD'];

// In-memory cache for last broadcasted prices
const lastBroadcastedPrices: Record<string, number> = {};

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

    // Phase 1: Initialize connection (reuse if warm)
    const { priceChannel } = await initializeSupabase();

    // Phase 1: Apply significance filtering BEFORE broadcasting
    const filteredPrices = filterSignificantPrices(prices);
    
    if (filteredPrices.length === 0) {
      console.log('✅ No significant price changes - skipping broadcast');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No significant changes to broadcast',
        processed: prices.length,
        broadcasted: 0,
        filtered: prices.length
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Phase 1: Broadcast only significant price updates
    let successfulBroadcasts = 0;
    const broadcastPromises = filteredPrices.map(async (price, index) => {
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
            ts: price.timestamp || new Date().toISOString(),
          },
        });

        if (broadcastResult === 'ok') {
          console.log(`💰 Broadcasted ${price.symbol}: $${price.price}`);
          return true;
        } else {
          console.warn(`⚠️ Broadcast failed for ${price.symbol}:`, broadcastResult);
          return false;
        }
      } catch (error) {
        console.error(`❌ Error broadcasting price at index ${index}:`, error);
        return false;
      }
    });

    const results = await Promise.all(broadcastPromises);
    successfulBroadcasts = results.filter(Boolean).length;

    console.log(`📈 Successfully broadcasted ${successfulBroadcasts}/${filteredPrices.length} filtered prices (${prices.length - filteredPrices.length} filtered out)`);

    // Phase 1: Success response with enhanced metrics
    const responseMessage = `Processed ${prices.length} price(s), filtered to ${filteredPrices.length}, broadcasted ${successfulBroadcasts}`;
    console.log(`✅ ${responseMessage}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: responseMessage,
      processed: prices.length,
      significant: filteredPrices.length,
      broadcasted: successfulBroadcasts,
      efficiency: `${Math.round((prices.length - filteredPrices.length) / prices.length * 100)}% filtered`,
      version: '2.0-optimized'
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
