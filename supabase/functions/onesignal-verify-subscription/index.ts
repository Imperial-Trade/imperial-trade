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
    const { user_id, player_id } = await req.json();
    console.log(`[OneSignal Verify] Checking subscription for user: ${user_id}, player_id: ${player_id}`);

    // Get environment variables
    const oneSignalAppId = Deno.env.get('ONESIGNAL_APP_ID');
    const oneSignalApiKey = Deno.env.get('ONESIGNAL_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!oneSignalAppId || !oneSignalApiKey || !supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing required environment variables');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get current database status
    const { data: profileData } = await supabase
      .from('profiles')
      .select('push_subscription_active, onesignal_subscription_status, onesignal_player_id')
      .eq('id', user_id)
      .single();

    const databaseStatus = {
      push_subscription_active: profileData?.push_subscription_active || false,
      onesignal_subscription_status: profileData?.onesignal_subscription_status || 'unknown',
      stored_player_id: profileData?.onesignal_player_id || null
    };

    let playerData: any = null;
    let playerExists = false;
    let playerSubscribed = false;
    let webpushSubscribed = false;
    let emailSubscribed = false;
    let hasActiveWebpush = false;
    let inSubscribedSegment = false;
    let verificationMethod = 'user_lookup_only';

    // Try to get user info via OneSignal Users API (using external_id)
    try {
      const userResponse = await fetch(
        `https://onesignal.com/api/v1/apps/${oneSignalAppId}/users?filter[external_id]=${user_id}`,
        {
          headers: {
            'Authorization': `Basic ${oneSignalApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (userResponse.ok) {
        const userData = await userResponse.json();
        console.log(`[OneSignal Verify] User found via Users API: ${userData.total_count} total subscriptions`);
        
        if (userData.total_count > 0) {
          playerExists = true;
          const user = userData.users[0];
          
          // Analyze subscriptions
          const subscriptions = user.subscriptions || [];
          const webpushSubs = subscriptions.filter((sub: any) => sub.type === 'webpush');
          const emailSubs = subscriptions.filter((sub: any) => sub.type === 'email');
          
          console.log(`[OneSignal Verify] - WebPush subscriptions: ${webpushSubs.length} (${webpushSubs.filter((s: any) => s.enabled).length} enabled)`);
          console.log(`[OneSignal Verify] - Email subscriptions: ${emailSubs.length} (${emailSubs.filter((s: any) => s.enabled).length} enabled)`);
          
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
      console.error(`[OneSignal Verify] Error fetching user from OneSignal:`, error);
    }

    // Check if user is in subscribed segment (has active push notifications)
    if (hasActiveWebpush) {
      inSubscribedSegment = true;
      console.log(`[OneSignal Verify] User in subscribed segment - active WebPush found`);
    } else if (emailSubscribed && !webpushSubscribed) {
      console.log(`[OneSignal Verify] User has email subscription but no WebPush - not in push segment`);
    } else {
      console.log(`[OneSignal Verify] User not in subscribed segment - no active WebPush subscriptions`);
    }

    // Determine overall subscription status
    const isSubscribed = webpushSubscribed && hasActiveWebpush;

    const result = {
      user_id,
      player_id,
      player_exists,
      player_subscribed: isSubscribed,
      webpush_subscribed: webpushSubscribed,
      email_subscribed: emailSubscribed,
      has_active_webpush: hasActiveWebpush,
      in_subscribed_segment: inSubscribedSegment,
      is_subscribed: isSubscribed,
      database_status: databaseStatus,
      player_data: playerData,
      verification_method: verificationMethod,
      verified_at: new Date().toISOString()
    };

    console.log(`[OneSignal Verify] Verification result:`, JSON.stringify(result, null, 2));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[OneSignal Verify] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});