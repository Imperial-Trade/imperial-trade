// OneSignal subscription verification edge function
// Verifies if user is properly subscribed in OneSignal's system

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequestBody {
  user_id?: string;
  email?: string;
  external_user_id?: string;
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

    if (!apiKey || !appId) {
      return new Response(
        JSON.stringify({ error: "OneSignal configuration missing" }),
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

    const body: VerifyRequestBody = await req.json().catch(() => ({}));
    const userId = body.user_id || body.external_user_id;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[OneSignal Verify] Checking subscription for user: ${userId}`);

    // Check if user exists in OneSignal by external_id
    const userUrl = `https://api.onesignal.com/apps/${appId}/users/by/external_id/${userId}`;
    const userResponse = await fetch(userUrl, {
      headers: {
        Authorization: `Basic ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!userResponse.ok) {
      if (userResponse.status === 404) {
        return new Response(
          JSON.stringify({
            exists: false,
            subscribed: false,
            message: "User not found in OneSignal",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorData = await userResponse.json().catch(() => ({}));
      console.error(`[OneSignal Verify] API error:`, errorData);
      return new Response(
        JSON.stringify({ error: "Failed to check user status", details: errorData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userData = await userResponse.json();
    console.log(`[OneSignal Verify] User data:`, userData);

    // Check subscription status
    const subscriptions = userData.subscriptions || [];
    const pushSubscriptions = subscriptions.filter((sub: any) => sub.type === "AndroidPush" || sub.type === "iOSPush" || sub.type === "ChromePush" || sub.type === "FirefoxPush" || sub.type === "SafariPush");
    
    const hasActiveSubscription = pushSubscriptions.some((sub: any) => sub.enabled === true);
    const totalSubscriptions = pushSubscriptions.length;
    const enabledSubscriptions = pushSubscriptions.filter((sub: any) => sub.enabled === true).length;

    // Additional check: Query subscribed users segment
    let inSubscribedSegment = false;
    try {
      const segmentUrl = `https://api.onesignal.com/apps/${appId}/players?filter=[{"field":"tag","key":"external_user_id","relation":"=","value":"${userId}"},{"operator":"AND"},{"field":"invalid_identifier","relation":"=","value":"false"}]&limit=1`;
      const segmentResponse = await fetch(segmentUrl, {
        headers: {
          Authorization: `Basic ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (segmentResponse.ok) {
        const segmentData = await segmentResponse.json();
        inSubscribedSegment = segmentData.players && segmentData.players.length > 0;
      }
    } catch (err) {
      console.warn(`[OneSignal Verify] Failed to check segment membership:`, err);
    }

    const verificationResult = {
      exists: true,
      subscribed: hasActiveSubscription,
      inSubscribedSegment,
      totalSubscriptions,
      enabledSubscriptions,
      subscriptionDetails: pushSubscriptions.map((sub: any) => ({
        type: sub.type,
        enabled: sub.enabled,
        id: sub.id,
      })),
      lastActive: userData.last_active,
      createdAt: userData.created_at,
    };

    console.log(`[OneSignal Verify] Verification result:`, verificationResult);

    return new Response(
      JSON.stringify(verificationResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[OneSignal Verify] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});