import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { notifyRoomEvent } from "@/utils/notifyRoomEvent";
import type { RoomSignal } from "./types";

type TpRow = { price: number; hit?: boolean };

async function fetchSignal(signalId: string): Promise<RoomSignal | null> {
  const { data, error } = await supabase
    .from("room_signals")
    .select("*")
    .eq("id", signalId)
    .maybeSingle();
  if (error) throw error;
  return data as RoomSignal | null;
}

async function insertUpdate(
  signalId: string,
  type: "tp_hit" | "sl_hit" | "edit" | "cancel" | "note",
  value: Record<string, unknown>,
) {
  const { error } = await supabase.from("room_signal_updates").insert({
    signal_id: signalId,
    type,
    value: value as never,
  });
  if (error) throw error;
}

export function useSignalActions(roomId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["pattern-stream"] });
  }, [qc]);

  const markTpHit = useCallback(
    async (signalId: string, tpIndex: number) => {
      if (!roomId || !user) return;
      const signal = await fetchSignal(signalId);
      if (!signal) throw new Error("Signal not found");

      const tps = Array.isArray(signal.tps) ? ([...signal.tps] as TpRow[]) : [];
      if (tpIndex < 0 || tpIndex >= tps.length) throw new Error("Invalid TP index");
      if (tps[tpIndex]?.hit) return;

      tps[tpIndex] = { ...tps[tpIndex], hit: true };

      const { error } = await supabase
        .from("room_signals")
        .update({ tps: tps as never })
        .eq("id", signalId);
      if (error) throw error;

      await insertUpdate(signalId, "tp_hit", {
        tp_index: tpIndex,
        price: tps[tpIndex].price,
      });

      void notifyRoomEvent({
        room_id: roomId,
        event: "tp_hit",
        signal_id: signalId,
        actor_id: user.id,
        summary: `${signal.symbol} TP${tpIndex + 1} hit`,
      });

      invalidate();
    },
    [roomId, user, invalidate],
  );

  const markSlHit = useCallback(
    async (signalId: string, pips: number) => {
      if (!roomId || !user) return;
      const signal = await fetchSignal(signalId);
      if (!signal) throw new Error("Signal not found");
      if (signal.status === "closed_loss") return;

      const { error } = await supabase
        .from("room_signals")
        .update({
          status: "closed_loss",
          pips: -Math.abs(pips),
          closed_at: new Date().toISOString(),
        })
        .eq("id", signalId);
      if (error) throw error;

      await insertUpdate(signalId, "sl_hit", { pips: -Math.abs(pips) });

      void notifyRoomEvent({
        room_id: roomId,
        event: "sl_hit",
        signal_id: signalId,
        actor_id: user.id,
        summary: `${signal.symbol} stop loss hit`,
      });

      invalidate();
    },
    [roomId, user, invalidate],
  );

  const closeWin = useCallback(
    async (signalId: string, pips: number) => {
      if (!roomId || !user) return;
      const signal = await fetchSignal(signalId);
      if (!signal) throw new Error("Signal not found");

      const { error } = await supabase
        .from("room_signals")
        .update({
          status: "closed_win",
          pips: Math.abs(pips),
          closed_at: new Date().toISOString(),
        })
        .eq("id", signalId);
      if (error) throw error;

      await insertUpdate(signalId, "note", { action: "closed_win", pips: Math.abs(pips) });

      invalidate();
    },
    [roomId, user, invalidate],
  );

  const cancelSignal = useCallback(
    async (signalId: string) => {
      if (!roomId || !user) return;
      const signal = await fetchSignal(signalId);
      if (!signal) throw new Error("Signal not found");

      const { error } = await supabase
        .from("room_signals")
        .update({
          status: "canceled",
          closed_at: new Date().toISOString(),
        })
        .eq("id", signalId);
      if (error) throw error;

      await insertUpdate(signalId, "cancel", {});

      invalidate();
    },
    [roomId, user, invalidate],
  );

  const updateNotes = useCallback(
    async (signalId: string, notes: string) => {
      if (!roomId || !user) return;

      const { error } = await supabase
        .from("room_signals")
        .update({ notes: notes.trim() || null })
        .eq("id", signalId);
      if (error) throw error;

      await insertUpdate(signalId, "edit", { field: "notes" });

      invalidate();
    },
    [roomId, user, invalidate],
  );

  return { markTpHit, markSlHit, closeWin, cancelSignal, updateNotes };
}
