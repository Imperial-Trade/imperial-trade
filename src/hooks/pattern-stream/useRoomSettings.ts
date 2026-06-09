import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Room, RoomUpdate } from "./types";
import type { Database } from "@/integrations/supabase/types";

type AuditCategory = Database["public"]["Enums"]["room_audit_category"];

const SUMMARIES: Record<AuditCategory, string> = {
  name: "Edited room name",
  description: "Edited room description",
  avatar: "Updated room avatar",
  rules: "Updated rules",
  invite: "Updated invite settings",
  plan: "Changed plan",
  background: "Updated background",
  member: "Updated members",
  role: "Changed roles",
  monetization: "Updated monetization",
  notifications: "Changed notification defaults",
  capacity: "Updated capacity",
};

/**
 * Helper for updating a room's settings AND auto-writing
 * a categorized audit event (which becomes a system message in chat).
 */
export function useRoomSettings(room: Room | undefined) {
  const { user } = useAuth();

  const updateField = useCallback(
    async (
      patch: RoomUpdate,
      category: AuditCategory,
      payload?: Record<string, unknown>,
      summary?: string,
    ) => {
      if (!room || !user) return;
      const { error: updErr } = await supabase
        .from("rooms")
        .update(patch)
        .eq("id", room.id);
      if (updErr) throw updErr;

      const summaryText = summary ?? SUMMARIES[category];
      const { error: auditErr } = await supabase.from("room_audit_events").insert({
        room_id: room.id,
        actor_id: user.id,
        category,
        summary: summaryText,
        payload: payload ?? {},
      });
      if (auditErr) throw auditErr;
    },
    [room, user],
  );

  const updateRules = useCallback(
    async (content: string) => {
      if (!room || !user) return;
      const { data: existing } = await supabase
        .from("room_rules")
        .select("version")
        .eq("room_id", room.id)
        .maybeSingle();
      const nextVersion = (existing?.version ?? 0) + 1;
      await supabase
        .from("room_rules")
        .upsert(
          {
            room_id: room.id,
            content,
            version: nextVersion,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          },
          { onConflict: "room_id" },
        );
      await supabase.from("room_audit_events").insert({
        room_id: room.id,
        actor_id: user.id,
        category: "rules",
        summary: SUMMARIES.rules,
        payload: { version: nextVersion },
      });
    },
    [room, user],
  );

  return { updateField, updateRules };
}
