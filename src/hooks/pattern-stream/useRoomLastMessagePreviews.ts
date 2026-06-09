import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { RoomMessageType } from "@/hooks/pattern-stream/types";

export interface RoomMessagePreviewRow {
  room_id: string;
  content: Json;
  created_at: string;
  user_id: string | null;
  type: RoomMessageType;
}

export interface RoomMessagePreview {
  room_id: string;
  content: Json;
  created_at: string;
  user_id: string | null;
  type: RoomMessageType;
  authorName: string | null;
}

function snippetFromMessage(
  type: RoomMessageType,
  content: Json,
): string {
  if (type === "text") {
    const text = (content as { text?: string } | null)?.text?.trim();
    return text && text.length > 0 ? text : "Message";
  }
  if (type === "media") {
    const payload = content as { kind?: string; urls?: string[]; url?: string } | null;
    const kind = payload?.kind;
    const urlCount = Array.isArray(payload?.urls)
      ? payload.urls.length
      : payload?.url
        ? 1
        : 0;
    if (kind === "image") {
      return urlCount > 1 ? `${urlCount} photos` : "Photo";
    }
    return urlCount > 1 ? `${urlCount} files` : "File";
  }
  if (type === "signal") return "New signal";
  if (type === "system") return "Update";
  return "Message";
}

export function formatInboxMessageSnippet(
  type: RoomMessageType,
  content: Json,
  opts: { userId: string | undefined; messageUserId: string | null; authorName: string | null },
): string {
  const base = snippetFromMessage(type, content);
  if (opts.messageUserId && opts.userId && opts.messageUserId === opts.userId) {
    return `You: ${base}`;
  }
  if (opts.authorName?.trim()) {
    return `${opts.authorName.trim()}: ${base}`;
  }
  return base;
}

/**
 * Fetches recent messages across many rooms and returns the latest non-deleted row per room.
 */
export function useRoomLastMessagePreviews(
  roomIds: string[],
  currentUserId: string | undefined,
) {
  const sortedKey = [...roomIds].sort().join(",");

  return useQuery({
    queryKey: ["pattern-stream", "room-last-messages", sortedKey],
    enabled: roomIds.length > 0 && !!currentUserId,
    staleTime: 10_000,
    queryFn: async (): Promise<Map<string, RoomMessagePreview>> => {
      const limit = Math.min(900, Math.max(120, roomIds.length * 15));
      const { data, error } = await supabase
        .from("room_messages")
        .select("room_id, content, created_at, user_id, type")
        .in("room_id", roomIds)
        .is("deleted_for", null)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;

      const rows = (data ?? []) as RoomMessagePreviewRow[];
      const firstByRoom = new Map<string, RoomMessagePreviewRow>();
      for (const row of rows) {
        if (!firstByRoom.has(row.room_id)) firstByRoom.set(row.room_id, row);
      }

      const authorIds = [
        ...new Set(
          [...firstByRoom.values()]
            .map((r) => r.user_id)
            .filter((id): id is string => !!id && id !== currentUserId),
        ),
      ];

      let names = new Map<string, string>();
      if (authorIds.length > 0) {
        const { data: profiles, error: pErr } = await supabase
          .from("public_profiles")
          .select("id, display_name")
          .in("id", authorIds);
        if (!pErr && profiles) {
          names = new Map(
            profiles.map((p) => [p.id, p.display_name?.trim() || "Member"]),
          );
        }
      }

      const out = new Map<string, RoomMessagePreview>();
      firstByRoom.forEach((row, roomId) => {
        const authorName = row.user_id ? names.get(row.user_id) ?? null : null;
        out.set(roomId, {
          room_id: roomId,
          content: row.content,
          created_at: row.created_at,
          user_id: row.user_id,
          type: row.type,
          authorName,
        });
      });
      return out;
    },
  });
}
