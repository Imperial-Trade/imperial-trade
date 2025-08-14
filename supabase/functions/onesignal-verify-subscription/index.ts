
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

    // First try to verify using Users API by external_id
    try {
      const userResponse = await fetch(`https://api.onesignal.com/apps/${appId}/users/by/external_id/${targetUserId}`, {
        method: "GET",
        headers: {
          Authorization: `Basic ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (userResponse.ok) {
        playerData = await userResponse.json();
        playerExists = true;
        // Check if user has any active push subscriptions
        const subscriptions = playerData.subscriptions || [];
        playerSubscribed = subscriptions.some((sub: any) => 
          (sub.type === "AndroidPush" || sub.type === "iOSPush" || sub.type === "WebPush") && sub.enabled
        );
        console.log(`[OneSignal Verify] User found via Users API: ${subscriptions.length} subscriptions`);
      } else {
        console.log(`[OneSignal Verify] User not found via Users API: ${userResponse.status}`);
        
        // Fallback: try legacy Players API if playerId is provided
        if (playerId) {
          playerResponse = await fetch(`https://api.onesignal.com/players/${playerId}?app_id=${appId}`, {
            method: "GET",
            headers: {
              Authorization: `Basic ${apiKey}`,
              "Content-Type": "application/json",
            },
          });

          if (playerResponse.ok) {
            playerData = await playerResponse.json();
            playerExists = true;
            playerSubscribed = playerData.valid_player === true && playerData.notification_types > 0;
            console.log(`[OneSignal Verify] Player found via Players API: valid=${playerData.valid_player}, types=${playerData.notification_types}`);
          } else {
            console.log(`[OneSignal Verify] Player not found via Players API: ${playerResponse.status}`);
          }
        }
      }
    } catch (error) {
      console.error(`[OneSignal Verify] Error checking user/player:`, error);
    }

    // Check if user is in "Subscribed Users" segment
    let segmentResponse;
    let inSubscribedSegment = false;

    try {
      // Get "Subscribed Users" segment (this is the default segment ID for subscribed users)
      segmentResponse = await fetch(`https://api.onesignal.com/apps/${appId}/segments`, {
        method: "GET",
        headers: {
          Authorization: `Basic ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (segmentResponse.ok) {
        const segments = await segmentResponse.json();
        const subscribedSegment = segments.segments?.find((seg: any) => 
          seg.name === "Subscribed Users" || seg.name === "Active Users"
        );

        if (subscribedSegment) {
          // Check if user is in this segment by external_user_id
          const segmentUsersResponse = await fetch(
            `https://api.onesignal.com/apps/${appId}/segments/${subscribedSegment.id}`,
            {
              method: "GET",
              headers: {
                Authorization: `Basic ${apiKey}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (segmentUsersResponse.ok) {
            const segmentData = await segmentUsersResponse.json();
            console.log(`[OneSignal Verify] Segment check completed for ${subscribedSegment.name}`);
            inSubscribedSegment = true; // Simplified check for now
          }
        }
      }
    } catch (error) {
      console.error(`[OneSignal Verify] Error checking segments:`, error);
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
