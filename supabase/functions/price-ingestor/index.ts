// supabase/functions/price-ingestor/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// This is the core logic that will be executed for every incoming request.
serve(async (req) => {
  // 1. SECURITY: First, ensure the request is a POST request.
  // We only want our DigitalOcean worker to be able to send data here.
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // 2. DATA EXTRACTION: Parse the incoming JSON data from the request body.
  // This will contain the `{ prices: [...] }` payload from our worker.
  const { prices } = await req.json();

  // If there are no prices for some reason, we can stop here.
  if (!prices || prices.length === 0) {
    return new Response('No prices received', { status: 400 });
  }

  // 3. CREATE SUPABASE CLIENT: To interact with Supabase services,
  // we need to initialize a client. We use the 'service_role' key
  // here because this is a trusted, server-to-server interaction.
  // This key bypasses any Row Level Security (RLS) policies.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // 4. ESTABLISH REALTIME CHANNEL: We define the "channel" or "frequency"
  // that we will be broadcasting on. Clients must listen to this exact channel name.
  const realtimeChannel = supabase.channel('live-prices');

  // 5. BROADCAST THE DATA: We loop through each price in the batch
  // and send it as a distinct broadcast message via the Realtime channel.
  for (const price of prices) {
    await realtimeChannel.send({
      type: 'broadcast',       // This must be 'broadcast' for client communication.
      event: 'price_update',   // This is our custom event name. Clients will listen for this.
      payload: {               // The actual data we are sending.
        symbol: price.symbol,
        price: price.price,
        ts: price.timestamp,
      },
    });
  }

  // (NOTE: In the future, this is where you would add the line to invoke your notification function)

  // 6. SEND SUCCESS RESPONSE: Acknowledge that the data was received and processed.
  // The DigitalOcean worker will see this '200 OK' response and know its job was done.
  return new Response(JSON.stringify({ success: true, message: `Processed ${prices.length} price(s).` }), {
    headers: { 'Content-Type': 'application/json' },
  });
});