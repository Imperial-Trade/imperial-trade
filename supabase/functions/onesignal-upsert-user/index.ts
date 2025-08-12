// Supabase Edge Function: onesignal-upsert-user
// Creates or updates a OneSignal User by external_id (Supabase user id)
// and ensures the Email subscription is enabled for that user.
// Requires secrets: ONESIGNAL_APP_ID, ONESIGNAL_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY

// IMPORTANT: This function expects an authenticated request (verify_jwt = true)
// and will default to the authenticated user's id/email when not provided in the body.

// CORS headers
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface UpsertRequestBody {
  user_id?: string;
  email?: string;
  tags?: Record<string, string>;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const appId = Deno.env.get("ONESIGNAL_APP_ID");
  const apiKey = Deno.env.get("ONESIGNAL_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

  if (!appId || !apiKey || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing required environment variables" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    // Create a Supabase client that uses the caller's auth context
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the authenticated user
    const { data: userData } = await supabase.auth.getUser();
    const authUser = userData?.user || null;

    // Parse body (optional)
    let body: UpsertRequestBody = {};
    try {
      if (req.headers.get("Content-Type")?.includes("application/json")) {
        body = (await req.json()) as UpsertRequestBody;
      }
    } catch {}

    const externalId = body.user_id || authUser?.id || "";
    const email = body.email || (authUser?.email as string | undefined) || undefined;
    const tags = body.tags || {};

    if (!externalId) {
      return new Response(
        JSON.stringify({ error: "No user_id provided and no authenticated user" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Helper to parse response text safely
    const safeText = async (r: Response) => {
      try { return await r.text(); } catch { return ""; }
    };

    // 1) Try to create the user with optional email subscription (idempotent-ish for our use case)
    const createUserPayload: any = {
      identity: { external_id: externalId },
      properties: { tags },
    };
    if (email) {
      createUserPayload.subscriptions = [
        {
          type: "Email",
          token: email,
          enabled: true,
        },
      ];
    }

    const createRes = await fetch(`https://api.onesignal.com/apps/${appId}/users`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createUserPayload),
    });

    if (createRes.ok) {
      const txt = await safeText(createRes);
      return new Response(
        JSON.stringify({
          success: true,
          action: "created_user",
          email_subscription_added: !!email,
          response: txt,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 2) If user already exists or creation failed, try adding/updating the Email subscription by alias (external_id)
    let subscriptionAttempt: { ok: boolean; status: number; text?: string } | null = null;
    if (email) {
      const subRes = await fetch(
        `https://api.onesignal.com/apps/${appId}/users/by/external_id/${externalId}/subscriptions`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subscription: {
              type: "Email",
              token: email,
              enabled: true,
            },
          }),
        }
      );
      subscriptionAttempt = { ok: subRes.ok, status: subRes.status, text: await safeText(subRes) };
      if (subRes.ok) {
        return new Response(
          JSON.stringify({
            success: true,
            action: "updated_email_subscription",
            response: subscriptionAttempt.text,
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // If we get here, both attempts failed
    const createTxt = await safeText(createRes);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to create/update OneSignal user",
        create_status: createRes.status,
        create_response: createTxt,
        subscription_status: subscriptionAttempt?.status,
        subscription_response: subscriptionAttempt?.text,
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    console.error("onesignal-upsert-user error:", err?.message || err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || String(err) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
