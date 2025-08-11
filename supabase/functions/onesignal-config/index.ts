import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

try {
    const url = new URL(req.url);
    const originHeader = req.headers.get("origin") || req.headers.get("referer") || "";
    let host = "";
    try { host = originHeader ? new URL(originHeader).host : url.host; } catch { host = url.host; }

    const defaults = {
      appId: Deno.env.get("ONESIGNAL_APP_ID"),
      safariWebId: Deno.env.get("ONESIGNAL_SAFARI_WEB_ID"),
    };

    const dev = {
      appId: Deno.env.get("ONESIGNAL_APP_ID_DEV") || defaults.appId,
      safariWebId: Deno.env.get("ONESIGNAL_SAFARI_WEB_ID_DEV") || defaults.safariWebId,
    };

    const staging = {
      appId: Deno.env.get("ONESIGNAL_APP_ID_STAGING") || Deno.env.get("ONESIGNAL_APP_ID_TEST") || dev.appId,
      safariWebId: Deno.env.get("ONESIGNAL_SAFARI_WEB_ID_STAGING") || Deno.env.get("ONESIGNAL_SAFARI_WEB_ID_TEST") || dev.safariWebId,
    };

    const prod = {
      appId: Deno.env.get("ONESIGNAL_APP_ID_PROD") || defaults.appId,
      safariWebId: Deno.env.get("ONESIGNAL_SAFARI_WEB_ID_PROD") || defaults.safariWebId,
    };

    const h = (host || "").toLowerCase();
    let variant: "dev" | "staging" | "prod" | "default" = "default";
    if (h.includes("localhost") || h.includes("127.0.0.1")) variant = "dev";
    else if (h.includes("staging") || h.includes("test") || h.includes("lovable.app")) variant = "staging";
    else if (h) variant = "prod";

    let selected = defaults;
    if (variant === "dev" && (dev.appId || dev.safariWebId)) selected = dev;
    else if (variant === "staging" && (staging.appId || staging.safariWebId)) selected = staging;
    else if (variant === "prod" && (prod.appId || prod.safariWebId)) selected = prod;

    return new Response(
      JSON.stringify({ appId: selected.appId, safariWebId: selected.safariWebId, meta: { variant, host: h } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=60" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to load OneSignal config" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=60, s-maxage=60" } }
    );
  }
});
