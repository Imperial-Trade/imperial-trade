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
    else if (
      h.includes("staging") ||
      h.includes("test") ||
      h.includes("lovable.app") ||
      h.includes("vercel.app") ||
      h.includes("netlify.app") ||
      h.includes("web.app") ||
      h.includes("pages.dev") ||
      h.includes("onrender.com") ||
      h.includes("herokuapp.com") ||
      h.includes("fly.dev")
    ) variant = "staging";
    else if (h) variant = "prod";

    // Select config and track if we had to fall back to defaults for this variant
    let selected = defaults;
    let usedDefaultForVariant = false;
    if (variant === "dev") {
      if (dev.appId || dev.safariWebId) selected = dev; else usedDefaultForVariant = true;
    } else if (variant === "staging") {
      if (staging.appId || staging.safariWebId) selected = staging; else usedDefaultForVariant = true;
    } else if (variant === "prod") {
      if (prod.appId || prod.safariWebId) selected = prod; else usedDefaultForVariant = true;
    }

    return new Response(
      JSON.stringify({ appId: selected.appId, safariWebId: selected.safariWebId, meta: { variant, host: h, usedDefaultForVariant } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=60" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to load OneSignal config" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=60, s-maxage=60" } }
    );
  }
});
