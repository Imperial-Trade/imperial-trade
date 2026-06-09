// =====================================================================
// stripe-connect-onboard
// ---------------------------------------------------------------------
// Creates (or fetches) a Stripe Express Connect account for the
// authenticated user (provider) and returns an account-onboarding URL.
//
// Required Supabase secrets:
//   STRIPE_SECRET_KEY
//   STRIPE_CONNECT_REFRESH_URL    (e.g. https://app/dashboard/pattern-stream/console/payouts?refresh=1)
//   STRIPE_CONNECT_RETURN_URL     (e.g. https://app/dashboard/pattern-stream/console/payouts?return=1)
// =====================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-06-20",
    });
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userResp } = await userClient.auth.getUser();
    const user = userResp?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existing } = await supabase
      .from("provider_payouts")
      .select("stripe_account_id")
      .eq("provider_id", user.id)
      .maybeSingle();

    let accountId = existing?.stripe_account_id ?? null;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email ?? undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { provider_id: user.id },
      });
      accountId = account.id;
      await supabase.from("provider_payouts").upsert(
        {
          provider_id: user.id,
          stripe_account_id: accountId,
          stripe_account_status: account.payouts_enabled ? "active" : "pending",
          charges_enabled: account.charges_enabled ?? false,
          payouts_enabled: account.payouts_enabled ?? false,
          details_submitted: account.details_submitted ?? false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "provider_id" },
      );
    }

    const link = await stripe.accountLinks.create({
      account: accountId!,
      refresh_url:
        Deno.env.get("STRIPE_CONNECT_REFRESH_URL") ??
        "https://www.tradeimperial.com/dashboard/pattern-stream/console/payouts?refresh=1",
      return_url:
        Deno.env.get("STRIPE_CONNECT_RETURN_URL") ??
        "https://www.tradeimperial.com/dashboard/pattern-stream/console/payouts?return=1",
      type: "account_onboarding",
    });

    return new Response(JSON.stringify({ url: link.url, account_id: accountId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[stripe-connect-onboard] error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
