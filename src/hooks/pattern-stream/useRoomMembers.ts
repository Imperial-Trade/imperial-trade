import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { RoomMember, RoomMemberRole, RoomMemberStatus } from "./types";

export interface RoomMemberWithProfile extends RoomMember {
  profile?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function useRoomMembers(roomId: string | undefined) {
  const { user } = useAuth();
  const [members, setMembers] = useState<RoomMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("room_members")
      .select("*")
      .eq("room_id", roomId);
    if (error) {
      setMembers([]);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as RoomMember[];
    const ids = rows.map((m) => m.user_id);
    let profiles: Array<{ id: string; display_name: string | null; avatar_url: string | null }> = [];
    if (ids.length > 0) {
      const { data: prof } = await supabase
        .from("public_profiles")
        .select("id, display_name, avatar_url")
        .in("id", ids);
      profiles = (prof ?? []) as typeof profiles;
    }
    const profMap = new Map(profiles.map((p) => [p.id, p]));
    setMembers(
      rows.map((m) => ({ ...m, profile: profMap.get(m.user_id) })) as RoomMemberWithProfile[],
    );
    setLoading(false);
  }, [roomId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const approve = useCallback(
    async (userId: string) => {
      if (!roomId) return;
      const { error } = await supabase
        .from("room_members")
        .update({
          status: "active",
          approved_at: new Date().toISOString(),
          approved_by: user?.id ?? null,
        })
        .eq("room_id", roomId)
        .eq("user_id", userId);
      if (error) throw error;
      await refresh();
    },
    [roomId, user, refresh],
  );

  const reject = useCallback(
    async (userId: string) => {
      if (!roomId) return;
      const { error } = await supabase
        .from("room_members")
        .delete()
        .eq("room_id", roomId)
        .eq("user_id", userId);
      if (error) throw error;
      await refresh();
    },
    [roomId, refresh],
  );

  const setRole = useCallback(
    async (userId: string, role: RoomMemberRole) => {
      if (!roomId) return;
      const { error } = await supabase
        .from("room_members")
        .update({ role })
        .eq("room_id", roomId)
        .eq("user_id", userId);
      if (error) throw error;
      await refresh();
    },
    [roomId, refresh],
  );

  const setStatus = useCallback(
    async (userId: string, status: RoomMemberStatus, opts?: { until?: string | null; reason?: string | null }) => {
      if (!roomId) return;
      const patch: Partial<RoomMember> = { status };
      if (status === "muted") patch.mute_until = opts?.until ?? null;
      if (status === "timed_out") patch.timeout_until = opts?.until ?? null;
      if (status === "banned") patch.ban_reason = opts?.reason ?? null;
      const { error } = await supabase
        .from("room_members")
        .update(patch)
        .eq("room_id", roomId)
        .eq("user_id", userId);
      if (error) throw error;
      await refresh();
    },
    [roomId, refresh],
  );

  return { members, loading, approve, reject, setRole, setStatus, refresh };
}
