import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRoomRealtime } from "./useRoomRealtime";
import type { RoomSignal, RoomSignalStatus, Room } from "./types";

export type SignalsFilter = "all" | "active" | "pending" | "closed";

/** Sync gate: active owner/provider membership, or rooms.owner_id match. */
export function deriveCanPostSignal(
  room: Pick<Room, "owner_id"> | null | undefined,
  membership: { role: string; status: string } | null | undefined,
  userId: string | undefined,
): boolean {
  if (!userId || membership?.status !== "active") return false;
  if (membership.role === "owner" || membership.role === "provider") return true;
  return room?.owner_id === userId;
}

export function useRoomSignals(roomId: string | undefined) {
  const { user } = useAuth();
  const [signals, setSignals] = useState<RoomSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      const { data, error: err } = await supabase
        .from("room_signals")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (cancelled) return;
      if (err) setError(err.message);
      else setSignals((data ?? []) as RoomSignal[]);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  useRoomRealtime(roomId, user?.id, {
    onSignal: ({ eventType, new: row, old }) => {
      if (eventType === "INSERT" && row) {
        setSignals((prev) => {
          const rec = row as RoomSignal;
          if (prev.some((s) => s.id === rec.id)) return prev;
          return [rec, ...prev];
        });
      }
      if (eventType === "UPDATE" && row) {
        const rec = row as RoomSignal;
        setSignals((prev) => prev.map((s) => (s.id === rec.id ? rec : s)));
      }
      if (eventType === "DELETE" && old) {
        const id = (old as { id?: string }).id;
        if (id) setSignals((prev) => prev.filter((s) => s.id !== id));
      }
    },
  });

  const stats = useMemo(() => {
    const wins = signals.filter((s) => s.status === "closed_win").length;
    const losses = signals.filter((s) => s.status === "closed_loss").length;
    const closed = wins + losses;
    const winRate = closed === 0 ? 0 : Math.round((wins / closed) * 1000) / 10;
    const pipsGained = signals.reduce((acc, s) => acc + Math.max(0, Number(s.pips ?? 0)), 0);
    const pipsLost = signals.reduce((acc, s) => acc + Math.max(0, -Number(s.pips ?? 0)), 0);
    return { total: signals.length, wins, losses, winRate, pipsGained, pipsLost };
  }, [signals]);

  const filterBy = useCallback(
    (filter: SignalsFilter): RoomSignal[] => {
      if (filter === "all") return signals;
      if (filter === "active") return signals.filter((s) => s.status === "active");
      if (filter === "pending") return signals.filter((s) => s.status === "pending");
      return signals.filter((s) => s.status === "closed_win" || s.status === "closed_loss" || s.status === "canceled");
    },
    [signals],
  );

  return { signals, loading, error, stats, filterBy };
}

export function useCanPostSignal(
  roomId: string | undefined,
  roomOwnerId?: string | null,
) {
  const { user } = useAuth();
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    if (!roomId || !user) {
      setAllowed(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("room_members")
        .select("role, status")
        .eq("room_id", roomId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      let ownerId = roomOwnerId ?? null;
      if (ownerId == null) {
        const { data: roomRow } = await supabase
          .from("rooms")
          .select("owner_id")
          .eq("id", roomId)
          .maybeSingle();
        ownerId = roomRow?.owner_id ?? null;
      }
      setAllowed(deriveCanPostSignal({ owner_id: ownerId }, data, user.id));
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId, roomOwnerId, user]);
  return allowed;
}

export const ROOM_SIGNAL_STATUS_COLORS: Record<RoomSignalStatus, string> = {
  pending: "var(--ps-warning)",
  active: "var(--ps-yellow-green)",
  closed_win: "var(--ps-green)",
  closed_loss: "var(--ps-negative)",
  canceled: "var(--ps-text-tertiary)",
};
