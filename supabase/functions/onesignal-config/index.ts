// Simplified OneSignal config function using single app secrets for all environments
// Public: no auth required

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[OneSignal Config] Request received');
    
    const appId = Deno.env.get("ONESIGNAL_APP_ID");
    const safariWebId = Deno.env.get("ONESIGNAL_SAFARI_WEB_ID");

    console.log('[OneSignal Config] Environment check:', {
      appIdExists: !!appId,
      safariWebIdExists: !!safariWebId,
      appIdLength: appId?.length || 0
    });

    if (!appId) {
      console.error('[OneSignal Config] ONESIGNAL_APP_ID is not configured in Supabase secrets');
      return new Response(
        JSON.stringify({ 
          error: "ONESIGNAL_APP_ID is not configured",
          hint: "Please add your OneSignal App ID to Supabase Edge Function secrets" 
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate App ID format (OneSignal App IDs are UUIDs)
    const appIdRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!appIdRegex.test(appId)) {
      console.error('[OneSignal Config] Invalid App ID format:', appId);
      return new Response(
        JSON.stringify({ 
          error: "Invalid OneSignal App ID format",
          hint: "OneSignal App ID should be a valid UUID format" 
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log('[OneSignal Config] Configuration validated successfully');

    return new Response(
      JSON.stringify({ 
        appId, 
        safariWebId: safariWebId || null,
        initialized: true 
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=30",
        },
      }
    );
  } catch (error) {
    console.error('[OneSignal Config] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to load OneSignal config",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
