import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRoomRealtime } from "./useRoomRealtime";
import type { RoomAssetRequest } from "./types";

export function useAssetRequests(roomId: string | undefined) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RoomAssetRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("room_asset_requests")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setRequests((data ?? []) as RoomAssetRequest[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // Realtime: piggyback on db channel via separate effect
  useRoomRealtime(roomId, user?.id, {});

  const submit = useCallback(
    async (asset: string, note?: string) => {
      if (!user || !roomId || !asset.trim()) return;
      const { data, error } = await supabase
        .from("room_asset_requests")
        .insert({
          room_id: roomId,
          requested_by: user.id,
          asset: asset.trim().toUpperCase(),
          note: note?.trim() ?? null,
          status: "requested",
        })
        .select()
        .single();
      if (error) throw error;
      setRequests((prev) => [data as RoomAssetRequest, ...prev]);
    },
    [roomId, user],
  );

  const updateStatus = useCallback(
    async (id: string, patch: Partial<Pick<RoomAssetRequest, "status" | "internal_notes" | "assigned_to">>) => {
      const { data, error } = await supabase
        .from("room_asset_requests")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      setRequests((prev) => prev.map((r) => (r.id === id ? (data as RoomAssetRequest) : r)));
    },
    [],
  );

  return { requests, loading, submit, updateStatus };
}
