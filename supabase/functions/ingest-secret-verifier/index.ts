import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed', match: false }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the provided secret from header
    const providedSecret = req.headers.get('X-INGEST-KEY');
    
    if (!providedSecret) {
      console.log('❌ No X-INGEST-KEY header provided');
      return new Response(
        JSON.stringify({ error: 'X-INGEST-KEY header required', match: false }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the server's secret
    const serverSecret = Deno.env.get('INGEST_SECRET');
    
    if (!serverSecret) {
      console.log('❌ Server INGEST_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error', match: false }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Compare secrets (constant-time comparison for security)
    const match = providedSecret === serverSecret;
    
    // Log result without exposing secrets
    console.log(`🔐 Secret verification: ${match ? 'MATCH ✅' : 'NO MATCH ❌'} - Header length: ${providedSecret.length}, Server length: ${serverSecret.length}`);

    if (match) {
      return new Response(
        JSON.stringify({ 
          match: true, 
          message: 'Secret matches perfectly! Your INGEST_SECRET is correct.' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          match: false, 
          message: 'Secret does not match. Please check your INGEST_SECRET value.',
          debug: {
            provided_length: providedSecret.length,
            expected_length: serverSecret.length
          }
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('❌ Secret verification error:', error.message);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        match: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});