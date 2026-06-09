import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Plan = "monthly" | "quarterly" | "yearly";

export function useStripeRoom() {
  const onboardProvider = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("stripe-connect-onboard", {});
    if (error) throw error;
    if (!data?.url) throw new Error("Onboarding URL missing");
    window.location.href = data.url as string;
  }, []);

  const startCheckout = useCallback(async (room_id: string, plan: Plan) => {
    const { data, error } = await supabase.functions.invoke("stripe-checkout-create", {
      body: { room_id, plan },
    });
    if (error) throw error;
    if (!data?.url) throw new Error("Checkout URL missing");
    window.location.href = data.url as string;
  }, []);

  return { onboardProvider, startCheckout };
}
