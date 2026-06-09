import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStripeRoom } from "@/hooks/pattern-stream/useStripeRoom";
import { useToast } from "@/hooks/use-toast";
import { Bank, ArrowSquareOut, CheckCircle, WarningCircle } from "@phosphor-icons/react";

export default function PayoutsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { onboardProvider } = useStripeRoom();
  const [busy, setBusy] = useState(false);

  const { data: payouts } = useQuery({
    enabled: !!user,
    queryKey: ["pattern-stream", "provider-payouts", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("provider_payouts")
        .select("*")
        .eq("provider_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const onConnect = async () => {
    setBusy(true);
    try {
      await onboardProvider();
    } catch (e) {
      toast({
        title: "Stripe Connect failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-3 sm:px-4 pt-3 pb-24 max-w-2xl mx-auto">
      <div className="liquid-glass p-6">
        <div className="flex items-start gap-3">
          <div
            className="liquid-glass--green flex items-center justify-center"
            style={{ width: 56, height: 56, borderRadius: 16, background: "var(--ps-glass-bg-elev)" }}
          >
            <Bank size={28} weight="duotone" style={{ color: "var(--ps-green)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--ps-text)" }}>
              Payouts
            </h2>
            <p className="mt-1" style={{ fontSize: 14, color: "var(--ps-text-secondary)" }}>
              Connect Stripe to start receiving subscription revenue from paid private rooms.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat
            label="Charges"
            value={payouts?.charges_enabled ? "Enabled" : "Pending"}
            ok={payouts?.charges_enabled}
          />
          <Stat
            label="Payouts"
            value={payouts?.payouts_enabled ? "Enabled" : "Pending"}
            ok={payouts?.payouts_enabled}
          />
          <Stat
            label="KYC"
            value={payouts?.details_submitted ? "Done" : "Required"}
            ok={payouts?.details_submitted}
          />
        </div>

        <button
          onClick={onConnect}
          disabled={busy}
          className="ps-btn ps-btn-primary w-full mt-4"
        >
          {busy
            ? "Opening Stripe..."
            : payouts?.stripe_account_id
            ? "Continue Stripe onboarding"
            : "Connect with Stripe"}
          <ArrowSquareOut size={16} />
        </button>

        <p className="mt-3" style={{ fontSize: 11, color: "var(--ps-text-tertiary)" }}>
          Stripe handles KYC, payouts, refunds, and tax. Platform fee is 10% per subscription.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="liquid-glass px-2 py-2 text-center" style={{ borderRadius: 12 }}>
      <div className="flex items-center justify-center gap-1" style={{ fontSize: 11, color: "var(--ps-text-tertiary)" }}>
        {label}
      </div>
      <div
        className="flex items-center justify-center gap-1 mt-1"
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: ok ? "var(--ps-green)" : "var(--ps-warning)",
        }}
      >
        {ok ? <CheckCircle size={14} weight="fill" /> : <WarningCircle size={14} weight="fill" />}
        {value}
      </div>
    </div>
  );
}
