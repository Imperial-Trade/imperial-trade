import { corsHeaders } from '../_shared/cors.ts';

console.log('TraderMade Streaming redirect function started');

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('CORS preflight request received');
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    console.log(`Redirecting ${req.method} request from tradermade-streaming to price-ingestor`);
    
    // Get the original request body and headers
    const body = req.method !== 'GET' ? await req.text() : null;
    const headers = Object.fromEntries(req.headers.entries());
    
    // Remove host header to avoid conflicts
    delete headers.host;
    
    // Forward the request to price-ingestor
    const priceIngestorUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/price-ingestor`;
    
    const response = await fetch(priceIngestorUrl, {
      method: req.method,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: body,
    });

    const responseData = await response.text();
    
    console.log(`Redirect successful: ${response.status}`);
    
    return new Response(responseData, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Error in tradermade-streaming redirect:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Redirect failed',
        message: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});