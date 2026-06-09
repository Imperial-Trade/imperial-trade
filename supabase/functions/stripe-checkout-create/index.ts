// =====================================================================
// stripe-checkout-create
// ---------------------------------------------------------------------
// Creates a Stripe Checkout Session for a member subscribing to a paid
// private room. Uses Stripe Connect destination charges so funds land
// in the room owner's connected account, with a configurable platform
// application fee.
//
// Body:
//   { room_id: string, plan: 'monthly' | 'quarterly' | 'yearly' }
// =====================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLATFORM_FEE_BPS = 1000; // 10%

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );

    const { data: userResp } = await userClient.auth.getUser();
    const user = userResp?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { room_id, plan } = (await req.json()) as { room_id: string; plan: "monthly" | "quarterly" | "yearly" };

    const { data: room } = await supabase
      .from("rooms")
      .select("id, owner_id, name, monetization")
      .eq("id", room_id)
      .single();
    if (!room || room.monetization !== "paid") {
      return new Response(JSON.stringify({ error: "room_not_paid" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pricing } = await supabase
      .from("room_pricing")
      .select("*")
      .eq("room_id", room_id)
      .maybeSingle();

    const priceId =
      plan === "monthly"
        ? pricing?.monthly_stripe_price_id
        : plan === "quarterly"
        ? pricing?.quarterly_stripe_price_id
        : pricing?.yearly_stripe_price_id;

    if (!priceId) {
      return new Response(JSON.stringify({ error: "price_not_configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: ownerPayouts } = await supabase
      .from("provider_payouts")
      .select("stripe_account_id")
      .eq("provider_id", room.owner_id)
      .maybeSingle();

    if (!ownerPayouts?.stripe_account_id) {
      return new Response(JSON.stringify({ error: "owner_not_connected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: user.email ?? undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        application_fee_percent: PLATFORM_FEE_BPS / 100,
        transfer_data: { destination: ownerPayouts.stripe_account_id },
        metadata: { room_id, user_id: user.id, plan },
      },
      metadata: { room_id, user_id: user.id, plan },
      success_url: `${Deno.env.get("APP_URL") ?? "https://www.tradeimperial.com"}/dashboard/pattern-stream/room/${room_id}?subscribed=1`,
      cancel_url: `${Deno.env.get("APP_URL") ?? "https://www.tradeimperial.com"}/dashboard/pattern-stream/room/${room_id}?canceled=1`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[stripe-checkout-create] error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
