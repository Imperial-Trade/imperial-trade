
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method === 'POST') {
      const { email } = await req.json();
      
      if (!email) {
        return new Response(
          JSON.stringify({ 
            status: 'error',
            error: 'Email is required' 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      console.log('Checking account status for email:', email);

      try {
        // Get account request by email
        const { data: accountRequest, error } = await supabase
          .from('account_requests')
          .select('*')
          .eq('email', email.toLowerCase())
          .order('created_at', { ascending: false })
          .limit(1);

        if (error && error.code !== 'PGRST116') {
          // PGRST116 is "not found" error, other errors are system errors
          console.error('Database error:', error);
          return new Response(
            JSON.stringify({ 
              status: 'error',
              error: 'System error occurred while checking status' 
            }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        if (!accountRequest || accountRequest.length === 0) {
          return new Response(
            JSON.stringify({ 
              status: 'not_found',
              message: 'No account request found for this email address'
            }),
            { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        return new Response(
          JSON.stringify({ 
            status: 'found',
            data: accountRequest[0]
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      } catch (dbError) {
        console.error('Database operation failed:', dbError);
        return new Response(
          JSON.stringify({ 
            status: 'error',
            error: 'Database connection failed. Please try again.' 
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        status: 'error',
        error: 'Method not allowed' 
      }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        status: 'error',
        error: 'Internal server error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
