
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

    // **PHASE 2: Enhanced User-Centric API with WebPush Focus**
    let webPushSubscribed = false;
    let emailSubscribed = false;
    let hasActiveWebPush = false;
    
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
        
        // **Phase 2: Separate WebPush and Email subscription analysis**
        const subscriptions = userData.subscriptions || [];
        const webPushSubs = subscriptions.filter((sub: any) => sub.type === "WebPush");
        const emailSubs = subscriptions.filter((sub: any) => sub.type === "Email");
        
        // **Critical: Only check WebPush for push notification verification**
        webPushSubscribed = webPushSubs.some((sub: any) => sub.enabled && sub.token);
        emailSubscribed = emailSubs.some((sub: any) => sub.enabled);
        hasActiveWebPush = webPushSubs.some((sub: any) => sub.enabled && sub.token && sub.id);
        
        // **Phase 2: Enhanced logging for WebPush vs Email distinction**
        console.log(`[OneSignal Verify] User found via Users API: ${subscriptions.length} total subscriptions`);
        console.log(`[OneSignal Verify] - WebPush subscriptions: ${webPushSubs.length} (${webPushSubs.filter(sub => sub.enabled).length} enabled)`);
        console.log(`[OneSignal Verify] - Email subscriptions: ${emailSubs.length} (${emailSubs.filter(sub => sub.enabled).length} enabled)`);
        console.log(`[OneSignal Verify] WebPush status: ${webPushSubscribed ? 'subscribed' : 'not subscribed'}`);
        console.log(`[OneSignal Verify] Email status: ${emailSubscribed ? 'subscribed' : 'not subscribed'}`);
        
        // **Phase 2: Player ID validation for WebPush**
        if (playerId && webPushSubs.length > 0) {
          const matchingWebPush = webPushSubs.find((sub: any) => sub.id === playerId);
          if (matchingWebPush) {
            console.log(`[OneSignal Verify] Player ID ${playerId} matched to WebPush subscription`);
          } else {
            console.log(`[OneSignal Verify] Player ID ${playerId} not found in WebPush subscriptions`);
          }
        }
        
      } else if (userResponse.status === 404) {
        console.log(`[OneSignal Verify] User not found via Users API: ${userResponse.status} (normal for new users)`);
        playerExists = false;
        webPushSubscribed = false;
        emailSubscribed = false;
        playerData = null;
      } else {
        console.log(`[OneSignal Verify] Users API error: ${userResponse.status}`);
        
        // **Phase 2: Fallback to player-specific API if user lookup fails**
        if (playerId) {
          console.log(`[OneSignal Verify] Attempting fallback player lookup for: ${playerId}`);
          try {
            const playerResponse = await fetch(`https://api.onesignal.com/apps/${appId}/players/${playerId}`, {
              method: "GET",
              headers: {
                Authorization: `Basic ${apiKey}`,
                "Content-Type": "application/json",
              },
            });
            
            if (playerResponse.ok) {
              const playerData = await playerResponse.json();
              playerExists = true;
              webPushSubscribed = playerData.invalid_identifier !== true;
              console.log(`[OneSignal Verify] Fallback player lookup successful: ${webPushSubscribed ? 'valid' : 'invalid'}`);
            }
          } catch (fallbackError) {
            console.warn(`[OneSignal Verify] Fallback player lookup failed:`, fallbackError);
          }
        }
      }
    } catch (error) {
      console.error(`[OneSignal Verify] Error checking user subscription:`, error);
      playerExists = false;
      webPushSubscribed = false;
      emailSubscribed = false;
      playerData = null;
    }
    
    // **Phase 2: Set primary subscription status based on WebPush only**
    playerSubscribed = webPushSubscribed;

    // **Phase 2: Enhanced segment checking with WebPush focus**
    let inSubscribedSegment = false;

    try {
      // **Phase 2: Base segment status on WebPush subscription specifically**
      if (playerExists && webPushSubscribed && hasActiveWebPush) {
        inSubscribedSegment = true;
        console.log(`[OneSignal Verify] User is in subscribed segment - has active WebPush subscription`);
      } else if (playerExists && emailSubscribed && !webPushSubscribed) {
        inSubscribedSegment = false; // Email-only users are not considered for push notifications
        console.log(`[OneSignal Verify] User has email subscription but no WebPush - not in push segment`);
      } else {
        console.log(`[OneSignal Verify] User not in subscribed segment - no active WebPush subscriptions`);
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

    // **PHASE 2: Production-Grade Subscription Status Determination**
    const isSubscribed = playerExists && webPushSubscribed; // Focus on WebPush only
    const verificationStatus = {
      user_id: targetUserId,
      player_id: playerId,
      player_exists: playerExists,
      player_subscribed: playerSubscribed, // This is now webPushSubscribed
      webpush_subscribed: webPushSubscribed,
      email_subscribed: emailSubscribed,
      has_active_webpush: hasActiveWebPush,
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
        subscriptions_count: playerData.subscriptions?.length || 0
      } : null,
      verification_method: playerId ? 'player_id_provided' : 'user_lookup_only',
      verified_at: new Date().toISOString(),
    };

    console.log(`[OneSignal Verify] Verification result:`, verificationStatus);

    return new Response(
      JSON.stringify({
        success: true,
        subscription_status: verificationStatus,
        // **Phase 2: Enhanced recommendations with WebPush-specific guidance**
        recommendations: (() => {
          const recs = [];
          
          if (!isSubscribed) {
            if (!playerExists) {
              recs.push(
                "User not found in OneSignal - ensure user creation completed",
                "Verify OneSignal SDK initialization completed successfully"
              );
            } else if (!webPushSubscribed) {
              recs.push(
                "WebPush subscription not active - user should grant push notification permissions",
                "Check if notifications are blocked in browser/device settings",
                "Verify browser supports push notifications (Chrome, Firefox, Safari, Edge)",
                "Ensure site is accessed via HTTPS for push notifications"
              );
            }
          }
          
          // **Enhanced player ID diagnostics**
          if (dbSubscriptionStatus?.onesignal_player_id && playerId &&
              dbSubscriptionStatus.onesignal_player_id !== playerId) {
            recs.push("Player ID mismatch detected - database sync required");
          }
          
          if (!playerId && webPushSubscribed) {
            recs.push("WebPush subscription exists but player ID not provided for verification");
          }
          
          // **Email vs WebPush distinction**
          if (emailSubscribed && !webPushSubscribed) {
            recs.push("User has email subscription but needs WebPush subscription for push notifications");
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
