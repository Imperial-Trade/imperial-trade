import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  GearSix,
  PencilSimple,
  Link as LinkIcon,
  Bell,
  Coins,
  ShieldCheck,
  Copy,
  Check,
} from "@phosphor-icons/react";
import { useRoomSettings } from "@/hooks/pattern-stream/useRoomSettings";
import type { RoomLayoutContext } from "./RoomLayout";

export default function SettingsTab() {
  const { room, membership } = useOutletContext<RoomLayoutContext>();
  const isOwner = membership?.role === "owner";
  const { toast } = useToast();
  const { updateField, updateRules } = useRoomSettings(room);
  const qc = useQueryClient();

  const [name, setName] = useState(room?.name ?? "");
  const [description, setDescription] = useState(room?.description ?? "");
  const [rules, setRules] = useState("");
  const [savingField, setSavingField] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load rules
  const { data: rulesRow } = useQuery({
    enabled: !!room?.id,
    queryKey: ["pattern-stream", "rules", room?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("room_rules")
        .select("content, version, updated_at")
        .eq("room_id", room!.id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    setName(room?.name ?? "");
    setDescription(room?.description ?? "");
  }, [room]);

  useEffect(() => {
    setRules(rulesRow?.content ?? "");
  }, [rulesRow]);

  if (!room) return null;

  const save = async (label: string, fn: () => Promise<void>) => {
    if (!isOwner) return;
    setSavingField(label);
    try {
      await fn();
      qc.invalidateQueries({ queryKey: ["pattern-stream"] });
      toast({ title: `${label} saved` });
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setSavingField(null);
    }
  };

  const inviteUrl = `${window.location.origin}/dashboard/pattern-stream/room/${room.id}${room.code ? `?code=${room.code}` : ""}`;
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.warn("[ps-settings] copy failed", err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-4 max-w-2xl mx-auto space-y-3">
      {/* Identity */}
      <Section title="Identity" icon={<PencilSimple size={16} />}>
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="ps-input"
            disabled={!isOwner}
            maxLength={64}
          />
        </Field>
        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="ps-input"
            disabled={!isOwner}
            style={{ height: 72, padding: "8px 12px", resize: "none" }}
            maxLength={280}
          />
        </Field>
        {isOwner && (name !== room.name || description !== (room.description ?? "")) && (
          <SaveBar
            saving={!!savingField}
            onSave={() =>
              save("Identity", async () => {
                if (name !== room.name) {
                  await updateField({ name }, "name", { from: room.name, to: name });
                }
                if (description !== (room.description ?? "")) {
                  await updateField({ description }, "description");
                }
              })
            }
          />
        )}
      </Section>

      {/* Invites */}
      <Section title="Invites" icon={<LinkIcon size={16} />}>
        <Field label="Invite link">
          <div className="flex items-center gap-2">
            <input value={inviteUrl} readOnly className="ps-input flex-1" />
            <button onClick={onCopy} className="ps-btn ps-btn-secondary ps-btn-icon" aria-label="Copy">
              {copied ? <Check size={16} weight="bold" /> : <Copy size={16} />}
            </button>
          </div>
        </Field>
        {room.code && (
          <Field label="4-digit code">
            <div className="ps-input ps-numeric flex items-center" style={{ letterSpacing: 4 }}>
              {room.code}
            </div>
          </Field>
        )}
        <p style={{ fontSize: 11, color: "var(--ps-text-tertiary)" }}>
          Anyone with the code can request to join. Approve from the Members tab.
        </p>
      </Section>

      {/* Rules */}
      <Section title="Rules" icon={<ShieldCheck size={16} />}>
        <textarea
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          className="ps-input"
          disabled={!isOwner}
          style={{ height: 140, padding: "10px 12px", resize: "vertical" }}
          placeholder="Be respectful, stay on topic..."
        />
        {isOwner && rules !== (rulesRow?.content ?? "") && (
          <SaveBar
            saving={!!savingField}
            onSave={() =>
              save("Rules", async () => {
                await updateRules(rules);
              })
            }
          />
        )}
      </Section>

      {/* Monetization */}
      <Section title="Monetization" icon={<Coins size={16} />}>
        <p style={{ fontSize: 13, color: "var(--ps-text-secondary)" }}>
          {room.monetization === "paid"
            ? "Paid subscription room. Manage plans + payouts in Provider Console."
            : "Free room. Switch to paid to enable Stripe-powered subscriptions."}
        </p>
        {isOwner && (
          <button
            className="ps-btn ps-btn-secondary mt-2"
            onClick={() =>
              save("Monetization", async () => {
                const next = room.monetization === "free" ? "paid" : "free";
                await updateField({ monetization: next }, "monetization", { to: next });
              })
            }
          >
            {room.monetization === "free" ? "Enable paid" : "Switch to free"}
          </button>
        )}
      </Section>

      {/* Notifications (default) */}
      <Section title="Notifications" icon={<Bell size={16} />}>
        <p style={{ fontSize: 13, color: "var(--ps-text-secondary)" }}>
          New members default to receiving signal notifications. Each member can customize their own settings later.
        </p>
      </Section>

      {/* Background */}
      <Section title="Chat background" icon={<GearSix size={16} />}>
        <p style={{ fontSize: 13, color: "var(--ps-text-secondary)" }}>
          Default subtle green tint. Owner-customizable palette coming online.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="liquid-glass p-4"
    >
      <div className="flex items-center gap-2 mb-3" style={{ color: "var(--ps-text)" }}>
        {icon}
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </motion.section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span
        className="block mb-1.5"
        style={{ fontSize: 11, color: "var(--ps-text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5 }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function SaveBar({ saving, onSave }: { saving: boolean; onSave: () => void }) {
  return (
    <div className="flex justify-end mt-2">
      <button onClick={onSave} disabled={saving} className="ps-btn ps-btn-primary ps-btn-sm">
        {saving ? "Saving..." : "Save changes"}
      </button>
    </div>
  );
}
