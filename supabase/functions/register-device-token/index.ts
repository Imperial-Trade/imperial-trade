import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, token, platform } = await req.json();

    if (!userId || !token || !platform) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, token, platform' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Update user's profile with device token
    const { error } = await supabase
      .from('profiles')
      .update({
        device_token: token,
        device_platform: platform,
        device_token_updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;

    console.log(`✅ Device token registered for user ${userId} on ${platform}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Device token registered successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Device token registration error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
