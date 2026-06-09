import { useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Target, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { RoomSignal } from "@/hooks/pattern-stream/types";
import { useSignalActions } from "@/hooks/pattern-stream/useSignalActions";
import { RoomTradeAlertCard } from "@/components/pattern-stream/signals/RoomTradeAlertCard";
import {
  INSIGHT_CARD_CLASS,
  INSIGHT_FOCUS_RING,
  INSIGHT_STAT_NEGATIVE,
  INSIGHT_STAT_POSITIVE,
} from "@/insight/insightCardTokens";
import { orderflowGlassBackdropClassName } from "@/insight/orderflowChrome";

interface SignalManageSheetProps {
  open: boolean;
  onClose: () => void;
  signal: RoomSignal | null;
  roomId: string | undefined;
  surface?: "pattern" | "insight";
}

export function SignalManageSheet({
  open,
  onClose,
  signal,
  roomId,
  surface = "pattern",
}: SignalManageSheetProps) {
  const { toast } = useToast();
  const { markTpHit, markSlHit, closeWin, cancelSignal, updateNotes } = useSignalActions(roomId);
  const [pipsInput, setPipsInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [busy, setBusy] = useState(false);

  const isInsight = surface === "insight";
  const isTerminal =
    signal?.status === "closed_win" ||
    signal?.status === "closed_loss" ||
    signal?.status === "canceled";

  useEffect(() => {
    if (!open || !signal) return;
    setPipsInput("");
    setNotesInput(signal.notes ?? "");
    setBusy(false);
  }, [open, signal?.id, signal?.notes]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      toast({ title: "Signal updated" });
      onClose();
    } catch (e) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  if (!signal) return null;

  const tps = Array.isArray(signal.tps)
    ? (signal.tps as Array<{ price: number; hit?: boolean }>)
    : [];

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent
        className={cn(
          isInsight ? orderflowGlassBackdropClassName : "liquid-glass",
          isInsight ? "border-border/60 bg-background/95" : undefined,
        )}
        style={
          isInsight
            ? undefined
            : { background: "var(--ps-surface-popover)", border: "1px solid var(--ps-border-subtle)" }
        }
      >
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle className={isInsight ? "text-foreground" : undefined} style={isInsight ? undefined : { color: "var(--ps-text)" }}>
            Manage signal
          </DrawerTitle>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "rounded-full p-2 text-muted-foreground hover:bg-muted/40",
              isInsight && INSIGHT_FOCUS_RING,
            )}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </DrawerHeader>

        <div className="px-4 pb-6 max-w-lg mx-auto space-y-4">
          <RoomTradeAlertCard
            signal={signal}
            roomId={roomId}
            canManage={false}
          />

          {!isTerminal && (
            <>
              {tps.length > 0 && (
                <div className={cn(isInsight && INSIGHT_CARD_CLASS, !isInsight && "space-y-2")}>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Mark TP hit
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {tps.map((tp, i) => (
                      <button
                        key={i}
                        type="button"
                        disabled={busy || tp.hit}
                        onClick={() => void run(() => markTpHit(signal.id, i))}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
                          INSIGHT_FOCUS_RING,
                          tp.hit
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "border-border/60 bg-muted/40 text-foreground hover:bg-muted/60",
                        )}
                      >
                        <Target size={12} weight={tp.hit ? "fill" : "regular"} />
                        TP{i + 1} · {tp.price.toFixed(2)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Pips (for close)
                </span>
                <input
                  value={pipsInput}
                  onChange={(e) => setPipsInput(e.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  className={cn(
                    "w-full rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-sm text-foreground",
                    INSIGHT_FOCUS_RING,
                  )}
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <motion.button
                  type="button"
                  disabled={busy || !pipsInput.trim()}
                  onClick={() =>
                    void run(() => closeWin(signal.id, Number(pipsInput)))
                  }
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-semibold",
                    INSIGHT_FOCUS_RING,
                    INSIGHT_STAT_POSITIVE,
                    "border-emerald-500/35 bg-emerald-500/10",
                  )}
                  whileTap={{ scale: 0.98 }}
                >
                  Close win
                </motion.button>
                <motion.button
                  type="button"
                  disabled={busy || !pipsInput.trim()}
                  onClick={() =>
                    void run(() => markSlHit(signal.id, Number(pipsInput)))
                  }
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-semibold",
                    INSIGHT_FOCUS_RING,
                    INSIGHT_STAT_NEGATIVE,
                    "border-rose-500/35 bg-rose-500/10",
                  )}
                  whileTap={{ scale: 0.98 }}
                >
                  SL hit
                </motion.button>
              </div>

              <motion.button
                type="button"
                disabled={busy}
                onClick={() => void run(() => cancelSignal(signal.id))}
                className={cn(
                  "w-full rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 text-sm font-medium text-muted-foreground",
                  INSIGHT_FOCUS_RING,
                )}
                whileTap={{ scale: 0.98 }}
              >
                Cancel signal
              </motion.button>
            </>
          )}

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Notes
            </span>
            <textarea
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              rows={3}
              maxLength={300}
              className={cn(
                "w-full resize-none rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-sm text-foreground",
                INSIGHT_FOCUS_RING,
              )}
            />
          </label>

          <motion.button
            type="button"
            disabled={busy}
            onClick={() => void run(() => updateNotes(signal.id, notesInput))}
            className={cn(
              "w-full rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--insight-canvas-bg,#0a0a0a)]",
              INSIGHT_FOCUS_RING,
              isInsight ? "bg-[var(--insight-gold)]" : "ps-btn ps-btn-primary",
            )}
            whileTap={{ scale: 0.98 }}
          >
            {busy ? "Saving…" : "Save notes"}
          </motion.button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
