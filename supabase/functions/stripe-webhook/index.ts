// =====================================================================
// stripe-webhook
// ---------------------------------------------------------------------
// Receives subscription lifecycle events and updates room_subscriptions.
// Applies a 3-day grace_until on past_due events.
//
// Required Supabase secrets:
//   STRIPE_SECRET_KEY
//   STRIPE_WEBHOOK_SECRET
// =====================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "stripe-signature, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GRACE_DAYS = 3;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("missing signature", { status: 400 });
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
    );
  } catch (e) {
    console.error("[stripe-webhook] signature verification failed:", e);
    return new Response("bad signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = session.metadata ?? {};
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        await supabase.from("room_subscriptions").upsert(
          {
            room_id: meta.room_id,
            user_id: meta.user_id,
            plan: meta.plan as "monthly" | "quarterly" | "yearly",
            stripe_subscription_id: sub.id,
            stripe_customer_id: sub.customer as string,
            stripe_price_id: sub.items.data[0]?.price?.id,
            status: "active",
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          },
          { onConflict: "room_id,user_id" },
        );
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const status = sub.status === "trialing"
          ? "trialing"
          : sub.status === "past_due"
          ? "past_due"
          : sub.status === "canceled"
          ? "canceled"
          : "active";
        const grace = sub.status === "past_due"
          ? new Date(Date.now() + GRACE_DAYS * 86400_000).toISOString()
          : null;
        await supabase
          .from("room_subscriptions")
          .update({
            status,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            grace_until: grace,
            canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
          })
          .eq("stripe_subscription_id", sub.id);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from("room_subscriptions")
          .update({
            status: "canceled",
            canceled_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", sub.id);
        break;
      }
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        const providerId = (account.metadata?.provider_id as string) ?? null;
        if (providerId) {
          await supabase.from("provider_payouts").upsert(
            {
              provider_id: providerId,
              stripe_account_id: account.id,
              stripe_account_status: account.payouts_enabled ? "active" : "pending",
              charges_enabled: account.charges_enabled ?? false,
              payouts_enabled: account.payouts_enabled ?? false,
              details_submitted: account.details_submitted ?? false,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "provider_id" },
          );
        }
        break;
      }
      default:
        // ignore
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[stripe-webhook] handler error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
