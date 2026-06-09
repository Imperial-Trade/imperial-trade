import { useState, useEffect, useMemo } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Lock, Globe, ArrowRight, X } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { useJoinRoom } from "@/hooks/pattern-stream/useJoinRoom";
import type { Room } from "@/hooks/pattern-stream/types";

interface JoinRoomSheetProps {
  room: Room | null;
  open: boolean;
  onClose: () => void;
  inviteToken?: string | null;
}

type Step = "rules" | "invited_by" | "submitting" | "done_active" | "done_pending";

interface RulesRow {
  content: string | null;
  version: number | null;
}

export function JoinRoomSheet({ room, open, onClose, inviteToken }: JoinRoomSheetProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { publicJoin, privateJoin } = useJoinRoom();

  const [step, setStep] = useState<Step>("rules");
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [inviterMode, setInviterMode] = useState<"self" | "other">("self");
  const [inviterReferral, setInviterReferral] = useState("");

  const isPrivate = room?.type === "private";

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep("rules");
      setRulesAccepted(false);
      setInviterMode("self");
      setInviterReferral("");
    }
  }, [open]);

  const { data: rules } = useQuery<RulesRow | null>({
    enabled: open && !!room,
    queryKey: ["pattern-stream", "rules", room?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_rules")
        .select("content, version")
        .eq("room_id", room!.id)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return data as RulesRow | null;
    },
  });

  const rulesText = useMemo(
    () =>
      rules?.content?.trim()
        ? rules.content
        : isPrivate
        ? "Be respectful. Do not share signals outside the room. Follow provider guidance and keep the room healthy."
        : "Be respectful. Stay on-topic. Do not spam or share misleading content. The owner can remove rule-breaking content.",
    [rules, isPrivate],
  );

  const handleContinue = async () => {
    if (!room || !user) return;

    // Public path
    if (!isPrivate) {
      setStep("submitting");
      try {
        await publicJoin.mutateAsync({ room, rulesAccepted: true });
        setStep("done_active");
        setTimeout(() => {
          onClose();
          navigate(`/dashboard/pattern-stream/room/${room.id}/chat`);
        }, 800);
      } catch (e) {
        toast({
          title: "Could not join",
          description: e instanceof Error ? e.message : String(e),
          variant: "destructive",
        });
        setStep("rules");
      }
      return;
    }

    // Private path
    if (step === "rules") {
      setStep("invited_by");
      return;
    }

    if (step === "invited_by") {
      setStep("submitting");
      try {
        await privateJoin.mutateAsync({
          room,
          inviteSelfReferral: inviterMode === "self" ? "self-invite" : inviterReferral.trim() || null,
          inviteToken: inviteToken ?? null,
          rulesAccepted: true,
        });
        setStep("done_pending");
        setTimeout(() => {
          onClose();
          navigate(`/dashboard/pattern-stream/room/${room.id}/chat`);
        }, 1200);
      } catch (e) {
        toast({
          title: "Could not request to join",
          description: e instanceof Error ? e.message : String(e),
          variant: "destructive",
        });
        setStep("invited_by");
      }
    }
  };

  if (!room) return null;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="liquid-glass" style={{ background: "var(--ps-surface-popover)", border: "1px solid var(--ps-border-subtle)" }}>
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle className="flex items-center gap-2" style={{ color: "var(--ps-text)" }}>
            {isPrivate ? <Lock size={18} weight="fill" /> : <Globe size={18} weight="fill" />}
            {step === "done_active" || step === "done_pending"
              ? isPrivate
                ? "Request submitted"
                : "Welcome in"
              : `Join ${room.name}`}
          </DrawerTitle>
          <button onClick={onClose} className="ps-btn-icon ps-btn-ghost" aria-label="Close">
            <X size={18} />
          </button>
        </DrawerHeader>

        <div className="px-4 pb-6 max-w-lg mx-auto">
          <AnimatePresence mode="wait">
            {step === "rules" && (
              <motion.div key="rules" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Section title="Room rules">
                  <div
                    className="liquid-glass--inset p-3 max-h-48 overflow-y-auto"
                    style={{ borderRadius: 14, fontSize: 13, color: "var(--ps-text-secondary)", whiteSpace: "pre-wrap" }}
                  >
                    {rulesText}
                  </div>
                </Section>
                <label className="flex items-start gap-2 mt-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rulesAccepted}
                    onChange={(e) => setRulesAccepted(e.target.checked)}
                    style={{ marginTop: 4 }}
                  />
                  <span style={{ fontSize: 13, color: "var(--ps-text)" }}>
                    I have read and agree to the room rules.
                  </span>
                </label>
                <button
                  onClick={handleContinue}
                  disabled={!rulesAccepted}
                  className="ps-btn ps-btn-primary w-full mt-4"
                >
                  {isPrivate ? "Continue" : "Join room"}
                  <ArrowRight size={16} />
                </button>
              </motion.div>
            )}

            {step === "invited_by" && (
              <motion.div key="invited_by" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                <Section title="Who invited you?">
                  <div className="grid grid-cols-2 gap-2">
                    <ToggleSmall active={inviterMode === "self"} onClick={() => setInviterMode("self")} label="Self invite" />
                    <ToggleSmall active={inviterMode === "other"} onClick={() => setInviterMode("other")} label="Someone else" />
                  </div>
                  {inviterMode === "other" && (
                    <input
                      value={inviterReferral}
                      onChange={(e) => setInviterReferral(e.target.value)}
                      placeholder="Their handle or display name"
                      className="ps-input mt-3"
                    />
                  )}
                </Section>
                <p className="mt-3" style={{ fontSize: 12, color: "var(--ps-text-tertiary)" }}>
                  The owner reviews requests. You can chat in a limited preview while pending and start full access once approved.
                </p>
                <button onClick={handleContinue} className="ps-btn ps-btn-primary w-full mt-4">
                  Send request
                  <ArrowRight size={16} />
                </button>
              </motion.div>
            )}

            {step === "submitting" && (
              <motion.div key="submitting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-8 text-center">
                <div className="inline-block w-6 h-6 border-2 rounded-full border-t-transparent animate-spin" style={{ borderColor: "var(--ps-green)", borderTopColor: "transparent" }} />
                <p className="mt-2" style={{ fontSize: 14, color: "var(--ps-text-secondary)" }}>
                  Submitting...
                </p>
              </motion.div>
            )}

            {(step === "done_active" || step === "done_pending") && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                className="py-6 text-center"
              >
                <CheckCircle size={48} weight="fill" style={{ color: "var(--ps-green)" }} className="mx-auto" />
                <h3 className="mt-3" style={{ fontSize: 18, fontWeight: 600, color: "var(--ps-text)" }}>
                  {step === "done_active" ? "You are in" : "Request sent"}
                </h3>
                <p className="mt-1" style={{ fontSize: 14, color: "var(--ps-text-secondary)" }}>
                  {step === "done_active"
                    ? "Opening room..."
                    : "Owner will review your request. You will see the latest activity until approved."}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-2">
      <div
        className="mb-2"
        style={{ fontSize: 12, color: "var(--ps-text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5 }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function ToggleSmall({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="liquid-glass text-center"
      style={{
        height: 44,
        borderRadius: 12,
        borderColor: active ? "var(--ps-green)" : "var(--ps-border-subtle)",
        boxShadow: active ? "var(--ps-green-glow)" : undefined,
        color: active ? "var(--ps-green)" : "var(--ps-text)",
        fontWeight: 500,
      }}
    >
      {label}
    </button>
  );
}
