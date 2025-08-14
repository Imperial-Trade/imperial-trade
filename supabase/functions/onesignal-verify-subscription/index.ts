
// OneSignal subscription verification edge function
// Verifies if user is properly subscribed to push notifications

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequestBody {
  user_id?: string;
  player_id?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const apiKey = Deno.env.get("ONESIGNAL_API_KEY");
    const appId = Deno.env.get("ONESIGNAL_APP_ID");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!apiKey || !appId || !supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: "Configuration missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: VerifyRequestBody = await req.json().catch(() => ({}));
    const targetUserId = body.user_id || user.id;
    const playerId = body.player_id;

    console.log(`[OneSignal Verify] Checking subscription for user: ${targetUserId}, player_id: ${playerId}`);

    // Verify user exists in OneSignal
    let playerResponse;
    let playerExists = false;
    let playerSubscribed = false;
    let playerData = null;

    // Use User-Centric API to check subscription status
    try {
      const userResponse = await fetch(`https://api.onesignal.com/apps/${appId}/users/by/external_id/${targetUserId}`, {
        method: "GET",
        headers: {
          Authorization: `Basic ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        playerData = userData;
        playerExists = true;
        
        // Check if user has any active subscriptions (email or web push)
        const subscriptions = userData.subscriptions || [];
        const webPushSubs = subscriptions.filter((sub: any) => sub.type === "WebPush");
        const emailSubs = subscriptions.filter((sub: any) => sub.type === "Email");
        
        // User is considered subscribed if they have any active subscription
        playerSubscribed = webPushSubs.some((sub: any) => sub.enabled) || 
                          emailSubs.some((sub: any) => sub.enabled);
        
        console.log(`[OneSignal Verify] User found via Users API: ${subscriptions.length} total subscriptions (${webPushSubs.length} WebPush, ${emailSubs.length} Email)`);
        console.log(`[OneSignal Verify] Subscription status: ${playerSubscribed ? 'subscribed' : 'not subscribed'}`);
      } else {
        console.log(`[OneSignal Verify] User not found via Users API: ${userResponse.status}`);
        
        // For new users or users without subscriptions, this is normal
        // Don't try legacy API as it can cause confusion
        playerExists = false;
        playerSubscribed = false;
        playerData = null;
      }
    } catch (error) {
      console.error(`[OneSignal Verify] Error checking user subscription:`, error);
      playerExists = false;
      playerSubscribed = false;
      playerData = null;
    }

    // Check if user is in "Subscribed Users" segment (simplified approach)
    let inSubscribedSegment = false;

    try {
      // For User-Centric API, segments are less reliable for individual users
      // Instead, rely on the direct subscription status from user data
      if (playerExists && playerSubscribed) {
        inSubscribedSegment = true;
        console.log(`[OneSignal Verify] User is considered in subscribed segment based on active subscriptions`);
      } else {
        console.log(`[OneSignal Verify] User not in subscribed segment - no active subscriptions found`);
      }
    } catch (error) {
      console.error(`[OneSignal Verify] Error determining segment status:`, error);
    }

    // Check database subscription status
    let dbSubscriptionStatus = null;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('push_subscription_active, onesignal_subscription_status, onesignal_player_id')
        .eq('id', targetUserId)
        .single();
      
      dbSubscriptionStatus = profile;
    } catch (dbError) {
      console.error('Error fetching profile subscription status:', dbError);
    }

    // Determine overall subscription status
    const isSubscribed = playerExists && playerSubscribed;
    const verificationStatus = {
      user_id: targetUserId,
      player_id: playerId,
      player_exists: playerExists,
      player_subscribed: playerSubscribed,
      in_subscribed_segment: inSubscribedSegment,
      is_subscribed: isSubscribed,
      database_status: {
        push_subscription_active: dbSubscriptionStatus?.push_subscription_active || false,
        onesignal_subscription_status: dbSubscriptionStatus?.onesignal_subscription_status || 'unknown',
        stored_player_id: dbSubscriptionStatus?.onesignal_player_id || null
      },
      player_data: playerData ? {
        valid_player: playerData.valid_player,
        notification_types: playerData.notification_types,
        session_count: playerData.session_count,
        last_active: playerData.last_active,
        created_at: playerData.created_at,
      } : null,
      verified_at: new Date().toISOString(),
    };

    console.log(`[OneSignal Verify] Verification result:`, verificationStatus);

    return new Response(
      JSON.stringify({
        success: true,
        subscription_status: verificationStatus,
        recommendations: (() => {
          const recs = [];
          if (!isSubscribed) {
            recs.push(
              "User should grant push notification permissions",
              "Check if notifications are blocked in browser/device settings",
              "Try re-initializing OneSignal SDK",
              "Verify OneSignal configuration is correct"
            );
          }
          
          // Check for player ID mismatch
          if (dbSubscriptionStatus?.onesignal_player_id && 
              dbSubscriptionStatus.onesignal_player_id !== playerId) {
            recs.push("Player ID mismatch detected - database sync required");
          }
          
          return recs;
        })()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[OneSignal Verify] Error:`, error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Internal server error", 
        message: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
