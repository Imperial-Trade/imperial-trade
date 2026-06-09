import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAssetRequests } from "@/hooks/pattern-stream/useAssetRequests";
import { useAuth } from "@/contexts/AuthContext";
import {
  Briefcase,
  Plus,
  ClockCounterClockwise,
  CheckCircle,
  XCircle,
  PencilSimple,
} from "@phosphor-icons/react";
import { useToast } from "@/hooks/use-toast";
import type { RoomLayoutContext } from "./RoomLayout";
import type { RoomAssetRequest } from "@/hooks/pattern-stream/types";

const STATUS_LABELS: Record<RoomAssetRequest["status"], string> = {
  requested: "New",
  in_progress: "In progress",
  approved: "Approved",
  denied: "Denied",
  done: "Done",
};

const STATUS_TONES: Record<RoomAssetRequest["status"], string> = {
  requested: "var(--ps-warning)",
  in_progress: "var(--ps-yellow-green)",
  approved: "var(--ps-green)",
  denied: "var(--ps-negative)",
  done: "var(--ps-text-tertiary)",
};

export default function RequestsTab() {
  const { room, membership } = useOutletContext<RoomLayoutContext>();
  const { user } = useAuth();
  const { toast } = useToast();
  const isStaff =
    membership?.role === "owner" ||
    membership?.role === "admin" ||
    membership?.role === "provider";
  const { requests, loading, submit, updateStatus } = useAssetRequests(room?.id);
  const [showCompose, setShowCompose] = useState(false);
  const [asset, setAsset] = useState("");
  const [note, setNote] = useState("");

  const onSubmit = async () => {
    try {
      await submit(asset, note);
      setAsset("");
      setNote("");
      setShowCompose(false);
      toast({ title: "Request sent", description: `${asset.toUpperCase()} request submitted.` });
    } catch (e) {
      toast({
        title: "Could not submit",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div
        className="px-3 sm:px-4 pt-3 pb-2 sticky top-0"
        style={{ background: "var(--ps-canvas)", zIndex: 10 }}
      >
        <div className="flex items-center gap-2">
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--ps-text)" }}>
            Asset requests
          </h2>
          <span className="ps-chip" style={{ height: 22 }}>
            {requests.length}
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setShowCompose((v) => !v)}
            className="ps-btn ps-btn-primary ps-btn-sm"
          >
            <Plus size={14} weight="bold" />
            New request
          </button>
        </div>

        <AnimatePresence>
          {showCompose && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="liquid-glass mt-3 p-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  value={asset}
                  onChange={(e) => setAsset(e.target.value)}
                  placeholder="Symbol (e.g. XAUUSD)"
                  className="ps-input ps-numeric sm:col-span-1"
                  maxLength={16}
                  autoCapitalize="characters"
                />
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Reason or note (optional)"
                  className="ps-input sm:col-span-2"
                  maxLength={140}
                />
              </div>
              <div className="flex gap-2 mt-2 justify-end">
                <button onClick={() => setShowCompose(false)} className="ps-btn ps-btn-ghost ps-btn-sm">
                  Cancel
                </button>
                <button
                  onClick={onSubmit}
                  disabled={!asset.trim()}
                  className="ps-btn ps-btn-primary ps-btn-sm"
                >
                  Send request
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-3 sm:px-4 pb-6 flex-1 overflow-y-auto">
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="ps-skeleton" style={{ height: 64, borderRadius: 14 }} />
            ))}
          </div>
        )}

        {!loading && requests.length === 0 && (
          <div className="liquid-glass text-center py-10 px-6 mt-3">
            <div
              className="liquid-glass--green flex items-center justify-center mx-auto mb-3"
              style={{ width: 56, height: 56, borderRadius: 16, background: "var(--ps-glass-bg-elev)" }}
            >
              <Briefcase size={28} weight="duotone" style={{ color: "var(--ps-green)" }} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--ps-text)" }}>
              No requests yet
            </h3>
            <p className="mt-1" style={{ fontSize: 13, color: "var(--ps-text-secondary)" }}>
              {isStaff
                ? "Members will request analysis on specific assets here. Process them and post a signal to auto-resolve."
                : "Submit a request and the provider will respond inside the chat."}
            </p>
          </div>
        )}

        {!loading && requests.length > 0 && (
          <div className="space-y-2 pt-2">
            {requests.map((r) => (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="liquid-glass p-3"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: "var(--ps-glass-bg-elev)",
                    }}
                  >
                    <Briefcase size={16} weight="duotone" style={{ color: "var(--ps-green)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="ps-numeric"
                        style={{ fontSize: 14, fontWeight: 600, color: "var(--ps-text)" }}
                      >
                        {r.asset}
                      </span>
                      <span
                        className="ps-chip"
                        style={{
                          height: 22,
                          fontSize: 11,
                          color: STATUS_TONES[r.status],
                          borderColor: STATUS_TONES[r.status],
                        }}
                      >
                        {STATUS_LABELS[r.status]}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--ps-text-tertiary)" }}>
                        {new Date(r.created_at).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    {r.note && (
                      <p style={{ fontSize: 12, color: "var(--ps-text-secondary)", marginTop: 4 }}>
                        {r.note}
                      </p>
                    )}
                    {isStaff && r.internal_notes && (
                      <p
                        className="liquid-glass--inset px-2 py-1 mt-2"
                        style={{
                          fontSize: 11,
                          color: "var(--ps-text-tertiary)",
                          borderRadius: 8,
                          fontStyle: "italic",
                        }}
                      >
                        Internal: {r.internal_notes}
                      </p>
                    )}
                  </div>
                  {isStaff && (
                    <div className="flex flex-col gap-1">
                      {r.status !== "in_progress" && (
                        <ActionBtn
                          icon={<ClockCounterClockwise size={12} />}
                          label="Working"
                          onClick={() => updateStatus(r.id, { status: "in_progress" })}
                        />
                      )}
                      {r.status !== "done" && (
                        <ActionBtn
                          icon={<CheckCircle size={12} />}
                          label="Done"
                          onClick={() => updateStatus(r.id, { status: "done" })}
                        />
                      )}
                      {r.status !== "denied" && (
                        <ActionBtn
                          icon={<XCircle size={12} />}
                          label="Deny"
                          tone="negative"
                          onClick={() => updateStatus(r.id, { status: "denied" })}
                        />
                      )}
                      <ActionBtn
                        icon={<PencilSimple size={12} />}
                        label="Note"
                        onClick={() => {
                          const next = window.prompt("Internal note:", r.internal_notes ?? "");
                          if (next != null) updateStatus(r.id, { internal_notes: next });
                        }}
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: "negative";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ps-chip"
      style={{
        height: 24,
        fontSize: 11,
        cursor: "pointer",
        borderColor: tone === "negative" ? "var(--ps-negative)" : undefined,
        color: tone === "negative" ? "var(--ps-negative)" : undefined,
      }}
    >
      {icon}
      {label}
    </button>
  );
}
