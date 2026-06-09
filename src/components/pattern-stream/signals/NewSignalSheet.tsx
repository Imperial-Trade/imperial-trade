import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { Room, RoomSignal } from "@/hooks/pattern-stream/types";
import { notifyRoomEvent } from "@/utils/notifyRoomEvent";
import { buildRoomSignalInsert, tradeAlertSide } from "@/utils/mapTradeAlertToRoomSignal";
import OptimizedNewAlertForm from "@/components/signals/OptimizedNewAlertForm";
import type { TradeAlertSubmissionData } from "@/hooks/useOptimizedTradeAlertForm";
import { INSIGHT_FOCUS_RING } from "@/insight/insightCardTokens";

interface NewSignalSheetProps {
  open: boolean;
  onClose: () => void;
  room: Room;
  surface?: "pattern" | "insight";
  /** Syncs the signal card into chat when the DB trigger/realtime path is slow or missing. */
  onSignalPosted?: (signal: RoomSignal) => void | Promise<void>;
}

interface AssetRequestRow {
  id: string;
  asset: string;
  requested_by: string;
}

export function NewSignalSheet({
  open,
  onClose,
  room,
  surface = "pattern",
  onSignalPosted,
}: NewSignalSheetProps) {
  const isInsight = surface === "insight";
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [resolveRequests, setResolveRequests] = useState<Set<string>>(new Set());
  const [otherRooms, setOtherRooms] = useState<Set<string>>(new Set());

  const { data: assetRequests } = useQuery({
    enabled: open && !!room.id,
    queryKey: ["pattern-stream", "asset-requests-open", room.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("room_asset_requests")
        .select("id, asset, requested_by")
        .eq("room_id", room.id)
        .in("status", ["requested", "in_progress"]);
      return (data ?? []) as AssetRequestRow[];
    },
  });

  const { data: ownedRooms } = useQuery({
    enabled: open && !!user && !isInsight,
    queryKey: ["pattern-stream", "owned-rooms-quick", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("rooms")
        .select("id, name")
        .eq("owner_id", user!.id);
      return (data ?? []).filter((r) => r.id !== room.id);
    },
  });

  useEffect(() => {
    if (!open) {
      setResolveRequests(new Set());
      setOtherRooms(new Set());
    }
  }, [open]);

  const handleSubmit = async (data: TradeAlertSubmissionData) => {
    if (!user) return;

    const { data: signal, error } = await supabase
      .from("room_signals")
      .insert(buildRoomSignalInsert(data, room.id, user.id))
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    if (!isInsight && signal && otherRooms.size > 0) {
      const links = Array.from(otherRooms).map((rid) => ({ signal_id: signal.id, room_id: rid }));
      await supabase.from("room_signal_links").insert(links);
    }

    if (signal && resolveRequests.size > 0) {
      await supabase
        .from("room_asset_requests")
        .update({
          status: "done",
          resolved_signal_id: signal.id,
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
        })
        .in("id", Array.from(resolveRequests));
    }

    if (signal) {
      void notifyRoomEvent({
        room_id: room.id,
        event: "signal_created",
        signal_id: signal.id,
        actor_id: user.id,
        summary: `${data.tradermade_symbol} ${tradeAlertSide(data).toUpperCase()} signal posted`,
      });
      await onSignalPosted?.(signal as RoomSignal);
    }

    toast({
      title: "Signal posted",
      description: `${data.tradermade_symbol} ${tradeAlertSide(data).toUpperCase()} live.`,
    });
    qc.invalidateQueries({ queryKey: ["pattern-stream"] });
    onClose();
  };

  const toggleRequest = (id: string) => {
    setResolveRequests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleRoom = (id: string) => {
    setOtherRooms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        elevated
        className={cn(
          "max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-3 sm:p-6",
          isInsight && "border-border/60 bg-background",
        )}
        style={
          isInsight
            ? undefined
            : {
                background: "rgba(28, 28, 30, 0.7)",
                backdropFilter: "blur(30px) saturate(180%)",
                WebkitBackdropFilter: "blur(30px) saturate(180%)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }
        }
      >
        <OptimizedNewAlertForm onSubmit={handleSubmit} onCancel={onClose} />

        {!isInsight && (ownedRooms?.length ?? 0) > 0 && (
          <div className="mt-3 rounded-lg border border-border bg-card p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Also post to
            </p>
            <div className="flex flex-wrap gap-2">
              {ownedRooms!.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggleRoom(r.id)}
                  className="rounded-full border px-3 py-1 text-xs"
                  style={{
                    borderColor: otherRooms.has(r.id) ? "var(--ps-green)" : undefined,
                    color: otherRooms.has(r.id) ? "var(--ps-green)" : "var(--ps-text-secondary)",
                  }}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {(assetRequests?.length ?? 0) > 0 && (
          <div className="mt-3 rounded-lg border border-border bg-card p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Resolve asset requests
            </p>
            <div className="flex flex-col gap-1.5">
              {assetRequests!.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggleRequest(r.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-2 py-1.5 text-left",
                    isInsight ? "border-border/60 bg-muted/40" : "liquid-glass",
                    INSIGHT_FOCUS_RING,
                  )}
                  style={
                    isInsight
                      ? resolveRequests.has(r.id)
                        ? { borderColor: "rgb(16 185 129 / 0.4)" }
                        : undefined
                      : {
                          borderRadius: 12,
                          borderColor: resolveRequests.has(r.id) ? "var(--ps-green)" : undefined,
                        }
                  }
                >
                  <Briefcase size={14} className="text-emerald-500" />
                  <span className="text-[13px] text-foreground">{r.asset}</span>
                  {resolveRequests.has(r.id) && (
                    <span className="ml-auto text-[11px] text-emerald-500">will mark done</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
