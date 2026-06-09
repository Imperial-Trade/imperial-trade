import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { RoomNotificationPrefs } from "./types";

export const DEFAULT_ROOM_NOTIFICATION_PREFS = {
  signals: true,
  tp: true,
  sl: true,
  mentions: true,
  chat: false,
};

export function useRoomNotifications(roomId: string | undefined) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<RoomNotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId || !user) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("room_notification_prefs")
        .select("*")
        .eq("room_id", roomId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setPrefs(data as RoomNotificationPrefs | null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId, user]);

  const update = useCallback(
    async (patch: Partial<typeof DEFAULT_ROOM_NOTIFICATION_PREFS>) => {
      if (!roomId || !user) return;
      const merged = {
        room_id: roomId,
        user_id: user.id,
        ...DEFAULT_ROOM_NOTIFICATION_PREFS,
        ...(prefs ?? {}),
        ...patch,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("room_notification_prefs")
        .upsert(merged, { onConflict: "room_id,user_id" })
        .select()
        .single();
      if (error) throw error;
      setPrefs(data as RoomNotificationPrefs);
    },
    [roomId, user, prefs],
  );

  const effective = {
    ...DEFAULT_ROOM_NOTIFICATION_PREFS,
    ...(prefs ?? {}),
  };

  return { prefs: effective, loading, update };
}
