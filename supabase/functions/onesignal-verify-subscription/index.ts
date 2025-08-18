
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
      const missingVars = [];
      if (!oneSignalAppId) missingVars.push('ONESIGNAL_APP_ID');
      if (!oneSignalApiKey) missingVars.push('ONESIGNAL_API_KEY');
      if (!supabaseUrl) missingVars.push('SUPABASE_URL');
      if (!supabaseAnonKey) missingVars.push('SUPABASE_ANON_KEY');
      
      console.error('[OneSignal Verify] Missing environment variables:', missingVars);
      
      return new Response(
        JSON.stringify({ 
          error: 'Missing required environment variables',
          missing_vars: missingVars,
          details: 'Check Supabase Edge Functions secrets configuration'
        }),
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
    let firstActivePlayerId: string | null = null;

    // Enhanced user verification with detailed subscription analysis
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
        
        console.log(`[OneSignal Verify] User found via Users API - ID: ${user.id}`);
        playerExists = true;
        
        const subscriptions = user.subscriptions || [];
        console.log(`[OneSignal Verify] Found ${subscriptions.length} total subscriptions`);
        
        // Enhanced subscription analysis
        const webpushSubs = subscriptions.filter((sub: any) => sub.type === 'WebPush');
        const emailSubs = subscriptions.filter((sub: any) => sub.type === 'Email');
        const androidSubs = subscriptions.filter((sub: any) => sub.type === 'AndroidPush');
        const iosSubs = subscriptions.filter((sub: any) => sub.type === 'iOSPush');
        
        console.log(`[OneSignal Verify] Subscription breakdown: WebPush(${webpushSubs.length}), Email(${emailSubs.length}), Android(${androidSubs.length}), iOS(${iosSubs.length})`);
        
        // Check subscription statuses with detailed logging
        webpushSubscribed = webpushSubs.some((sub: any) => sub.enabled);
        emailSubscribed = emailSubs.some((sub: any) => sub.enabled);
        hasActiveWebpush = webpushSubscribed;
        
        // Get the most recent active WebPush subscription
        const activeWebpushSubs = webpushSubs.filter((sub: any) => sub.enabled);
        if (activeWebpushSubs.length > 0) {
          // Sort by last_session to get most recent
          activeWebpushSubs.sort((a: any, b: any) => {
            const aTime = new Date(a.last_session || 0).getTime();
            const bTime = new Date(b.last_session || 0).getTime();
            return bTime - aTime;
          });
          firstActivePlayerId = activeWebpushSubs[0].id;
          console.log(`[OneSignal Verify] Selected most recent WebPush subscription: ${firstActivePlayerId}`);
        }
        
        console.log(`[OneSignal Verify] Final status - WebPush: ${webpushSubscribed ? 'ACTIVE' : 'INACTIVE'}, Email: ${emailSubscribed ? 'ACTIVE' : 'INACTIVE'}`);
        
        // Enhanced player data with subscription details
        playerData = {
          valid_player: user.id,
          external_id: user.identity?.external_id,
          notification_types: user.notification_types,
          session_count: user.session_count,
          last_active: user.last_active,
          created_at: user.created_at,
          subscriptions_count: subscriptions.length,
          webpush_count: webpushSubs.length,
          email_count: emailSubs.length,
          active_webpush_count: activeWebpushSubs.length,
          timezone: user.properties?.timezone_id,
          language: user.properties?.language
        };
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

    // Enhanced response with comprehensive subscription status
    const response = {
      success: true,
      subscription_status: {
        // Core subscription flags
        player_exists: playerExists,
        is_subscribed: hasActiveWebpush,
        webpush_subscribed: webpushSubscribed,
        email_subscribed: emailSubscribed,
        has_active_webpush: hasActiveWebpush,
        in_subscribed_segment: hasActiveWebpush,
        
        // Enhanced subscription data
        subscription_summary: {
          total_subscriptions: playerData?.subscriptions_count || 0,
          webpush_subscriptions: playerData?.webpush_count || 0,
          active_webpush_subscriptions: playerData?.active_webpush_count || 0,
          email_subscriptions: playerData?.email_count || 0,
          recommended_action: !hasActiveWebpush ? 
            (webpushSubscribed ? 'resubscribe' : 'initial_subscription') : 
            'none'
        },
        
        // Player and user data
        player_data: playerData,
        player_id: firstActivePlayerId || player_id || null,
        
        // Detailed verification info
        details: {
          user_found_in_onesignal: !!playerExists,
          profile_exists_in_supabase: profileExists,
          subscription_check_timestamp: new Date().toISOString(),
          player_id: firstActivePlayerId || player_id || null,
          database_status: profileExists ? 'found' : 'not_found',
          verification_method: 'users_api_by_external_id',
          api_response_status: playerExists ? 'success' : 'not_found'
        }
      },
      
      // Backward compatibility fields
      is_subscribed: hasActiveWebpush,
      player_id: firstActivePlayerId || player_id || null
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

// Serve the handler
Deno.serve(handler);
