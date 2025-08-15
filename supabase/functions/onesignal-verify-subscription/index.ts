import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UpsertRequestBody {
  user_id: string;
  player_id?: string;
}

async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const oneSignalAppId = Deno.env.get('ONESIGNAL_APP_ID');
    const oneSignalApiKey = Deno.env.get('ONESIGNAL_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!oneSignalAppId || !oneSignalApiKey || !supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: 'Missing required environment variables' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseService = createClient(supabaseUrl, supabaseAnonKey);

    // Parse request body
    const { user_id, player_id } = await req.json() as UpsertRequestBody;

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[OneSignal Verify] Checking subscription for user: ${user_id}, player_id: ${player_id || 'undefined'}`);

    // Helper function to safely get text from response
    const safeText = async (response: Response): Promise<string> => {
      try {
        return await response.text();
      } catch {
        return '';
      }
    };

    // Helper function to safely parse JSON
    const safeJson = (text: string): any => {
      try {
        return text ? JSON.parse(text) : {};
      } catch {
        return {};
      }
    };

    // Check if user exists in Supabase profiles
    const { data: profile } = await supabaseService
      .from('profiles')
      .select('id')
      .eq('id', user_id)
      .single();

    const profileExists = !!profile;

    // Initialize response variables
    let playerExists = false;
    let webpushSubscribed = false;
    let emailSubscribed = false;
    let hasActiveWebpush = false;
    let playerData: any = null;

    // Try to fetch user from OneSignal Users API
    if (player_id) {
      try {
        const userResponse = await fetch(`https://api.onesignal.com/apps/${oneSignalAppId}/users/by/external_id/${user_id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${oneSignalApiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (userResponse.ok) {
          const responseText = await safeText(userResponse);
          const user = safeJson(responseText);
          
          console.log(`[OneSignal Verify] User found via Users API`);
          playerExists = true;
          
          const subscriptions = user.subscriptions || [];
          const webpushSubs = subscriptions.filter((sub: any) => sub.type === 'WebPush');
          const emailSubs = subscriptions.filter((sub: any) => sub.type === 'Email');
          
          webpushSubscribed = webpushSubs.some((sub: any) => sub.enabled);
          emailSubscribed = emailSubs.some((sub: any) => sub.enabled);
          hasActiveWebpush = webpushSubscribed;
          
          console.log(`[OneSignal Verify] WebPush status: ${webpushSubscribed ? 'subscribed' : 'not subscribed'}`);
          console.log(`[OneSignal Verify] Email status: ${emailSubscribed ? 'subscribed' : 'not subscribed'}`);
          
          playerData = {
            valid_player: user.id,
            notification_types: user.notification_types,
            session_count: user.session_count,
            last_active: user.last_active,
            created_at: user.created_at,
            subscriptions_count: subscriptions.length
          };
        }
      } else {
        console.log(`[OneSignal Verify] User not found via Users API: ${userResponse.status} (normal for new users)`);
      }
    } catch (error) {
      console.log(`[OneSignal Verify] OneSignal API error: ${error}`);
    }

    // Determine subscription status
    if (!hasActiveWebpush) {
      console.log(`[OneSignal Verify] User not in subscribed segment - no active WebPush subscriptions`);
    }

    // Build comprehensive response
    const response = {
      playerExists,
      player_subscribed: webpushSubscribed,
      webpush_subscribed: webpushSubscribed,
      email_subscribed: emailSubscribed,
      has_active_webpush: hasActiveWebpush,
      in_subscribed_segment: hasActiveWebpush,
      database_status: profileExists ? 'found' : 'not_found',
      player_data: playerData,
      player_id: player_id || null,
      is_subscribed: hasActiveWebpush,
      details: {
        user_found_in_onesignal: !!playerExists,
        profile_exists_in_supabase: profileExists,
        subscription_check_timestamp: new Date().toISOString()
      }
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error(`[OneSignal Verify] Error: ${error}`);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

// Export the handler
export { handler as default };