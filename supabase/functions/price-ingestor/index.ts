// supabase/functions/price-ingestor/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ingest-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// This is the core logic that will be executed for every incoming request.
serve(async (req) => {
  console.log(`🔄 [price-ingestor] ${req.method} request received from ${req.headers.get('origin') || 'unknown'}`);

  // 1. CORS: Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    console.log('✅ [price-ingestor] Handled CORS preflight request');
    return new Response(null, { 
      status: 200, 
      headers: corsHeaders 
    });
  }

  // 2. SECURITY: Ensure the request is a POST request
  if (req.method !== 'POST') {
    console.warn(`❌ [price-ingestor] Method ${req.method} not allowed`);
    return new Response('Method Not Allowed', { 
      status: 405,
      headers: corsHeaders 
    });
  }

  // 3. AUTHENTICATION: Verify the X-INGEST-KEY header
  const ingestKey = req.headers.get('X-INGEST-KEY') || req.headers.get('x-ingest-key');
  const expectedKey = Deno.env.get('INGEST_SECRET');
  
  if (!expectedKey) {
    console.error('❌ [price-ingestor] INGEST_SECRET not configured');
    return new Response('Server configuration error', { 
      status: 500,
      headers: corsHeaders 
    });
  }

  if (!ingestKey || ingestKey !== expectedKey) {
    console.warn('❌ [price-ingestor] Invalid or missing X-INGEST-KEY header');
    return new Response('Unauthorized', { 
      status: 401,
      headers: corsHeaders 
    });
  }

  console.log('✅ [price-ingestor] Authentication successful');

  try {
    // 4. DATA EXTRACTION: Parse the incoming JSON data from the request body
    const requestBody = await req.json();
    const { prices } = requestBody;

    // Validate payload structure
    if (!prices || !Array.isArray(prices) || prices.length === 0) {
      console.warn('❌ [price-ingestor] Invalid payload: missing or empty prices array');
      return new Response('Invalid payload: prices array is required and cannot be empty', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    console.log(`📊 [price-ingestor] Processing ${prices.length} price update(s)`);

    // 5. CREATE SUPABASE CLIENT: Initialize client with service role key
    // This bypasses Row Level Security (RLS) policies for server-to-server communication
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 6. ESTABLISH REALTIME CHANNEL: Create the channel for broadcasting
    const realtimeChannel = supabase.channel('live-prices');

    // 7. ENSURE CHANNEL SUBSCRIPTION: Wait for channel to be ready before broadcasting
    console.log('🔗 [price-ingestor] Establishing Realtime channel...');
    
    const channelStatus = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Channel subscription timeout'));
      }, 5000); // 5 second timeout

      realtimeChannel.subscribe((status) => {
        console.log(`📡 [price-ingestor] Channel status: ${status}`);
        clearTimeout(timeout);
        resolve(status);
      });
    });

    if (channelStatus !== 'SUBSCRIBED') {
      console.error(`❌ [price-ingestor] Channel subscription failed with status: ${channelStatus}`);
      return new Response('Failed to establish realtime channel', { 
        status: 500,
        headers: corsHeaders 
      });
    }

    console.log('✅ [price-ingestor] Realtime channel established successfully');

    // 8. BROADCAST PRICE DATA: Send each price update as a separate broadcast
    let successfulBroadcasts = 0;
    const broadcastPromises = prices.map(async (price, index) => {
      try {
        // Validate price data structure
        if (!price.symbol || typeof price.price !== 'number' || price.price <= 0) {
          console.warn(`⚠️ [price-ingestor] Skipping invalid price at index ${index}:`, price);
          return false;
        }

        const broadcastResult = await realtimeChannel.send({
          type: 'broadcast',
          event: 'price_update',
          payload: {
            symbol: price.symbol,
            price: price.price,
            ts: price.timestamp || new Date().toISOString(),
          },
        });

        if (broadcastResult === 'ok') {
          console.log(`💰 [price-ingestor] Broadcasted ${price.symbol}: $${price.price}`);
          return true;
        } else {
          console.warn(`⚠️ [price-ingestor] Broadcast failed for ${price.symbol}:`, broadcastResult);
          return false;
        }
      } catch (error) {
        console.error(`❌ [price-ingestor] Error broadcasting price at index ${index}:`, error);
        return false;
      }
    });

    // Wait for all broadcasts to complete
    const results = await Promise.all(broadcastPromises);
    successfulBroadcasts = results.filter(Boolean).length;

    console.log(`📈 [price-ingestor] Successfully broadcasted ${successfulBroadcasts}/${prices.length} prices`);

    // 9. CLEANUP: Remove the channel to prevent memory leaks
    await supabase.removeChannel(realtimeChannel);
    console.log('🧹 [price-ingestor] Channel cleaned up');

    // 10. SUCCESS RESPONSE: Acknowledge successful processing
    const responseMessage = `Processed ${prices.length} price(s), successfully broadcasted ${successfulBroadcasts}`;
    console.log(`✅ [price-ingestor] ${responseMessage}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: responseMessage,
        processed: prices.length,
        broadcasted: successfulBroadcasts 
      }), 
      {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        },
      }
    );

  } catch (error) {
    console.error('❌ [price-ingestor] Unexpected error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Internal server error',
        error: error.message 
      }), 
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        },
      }
    );
  }
});