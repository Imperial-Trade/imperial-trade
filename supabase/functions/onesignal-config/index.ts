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
    const appId = Deno.env.get("ONESIGNAL_APP_ID");
    const safariWebId = Deno.env.get("ONESIGNAL_SAFARI_WEB_ID");

    if (!appId) {
      return new Response(
        JSON.stringify({ error: "ONESIGNAL_APP_ID is not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ appId, safariWebId }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to load OneSignal config" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
