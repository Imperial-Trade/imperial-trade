import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ReactionRow {
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface AggregatedReaction {
  emoji: string;
  count: number;
  users: string[];
  userReacted: boolean;
}

/**
 * Aggregates reactions for a list of messages. Subscribes via realtime
 * piggybacking on parent useRoomRealtime in the chat tab.
 */
export function useMessageReactions(messageIds: string[]) {
  const { user } = useAuth();
  const [byMessage, setByMessage] = useState<Record<string, AggregatedReaction[]>>({});

  useEffect(() => {
    if (messageIds.length === 0) {
      setByMessage({});
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("room_message_reactions")
        .select("message_id, user_id, emoji, created_at")
        .in("message_id", messageIds);
      if (error || cancelled) return;
      const aggregated: Record<string, AggregatedReaction[]> = {};
      (data ?? []).forEach((r) => {
        const list = (aggregated[r.message_id] ??= []);
        const existing = list.find((a) => a.emoji === r.emoji);
        if (existing) {
          existing.count += 1;
          existing.users.push(r.user_id);
          if (r.user_id === user?.id) existing.userReacted = true;
        } else {
          list.push({
            emoji: r.emoji,
            count: 1,
            users: [r.user_id],
            userReacted: r.user_id === user?.id,
          });
        }
      });
      setByMessage(aggregated);
    })();
    return () => {
      cancelled = true;
    };
  }, [messageIds.join("|"), user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!user) return;
      // Optimistic
      setByMessage((prev) => {
        const list = [...(prev[messageId] ?? [])];
        const idx = list.findIndex((a) => a.emoji === emoji);
        if (idx === -1) {
          list.push({ emoji, count: 1, users: [user.id], userReacted: true });
        } else {
          const r = list[idx];
          if (r.userReacted) {
            r.count -= 1;
            r.users = r.users.filter((u) => u !== user.id);
            r.userReacted = false;
            if (r.count <= 0) list.splice(idx, 1);
          } else {
            r.count += 1;
            r.users.push(user.id);
            r.userReacted = true;
          }
        }
        return { ...prev, [messageId]: list };
      });

      // Persist
      const existing = await supabase
        .from("room_message_reactions")
        .select("user_id")
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .eq("emoji", emoji)
        .maybeSingle();
      if (existing.data) {
        await supabase
          .from("room_message_reactions")
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", user.id)
          .eq("emoji", emoji);
      } else {
        await supabase
          .from("room_message_reactions")
          .insert({ message_id: messageId, user_id: user.id, emoji });
      }
    },
    [user],
  );

  /** Replace local aggregate when realtime emits a reaction event. */
  const handleRealtimeReaction = useCallback(
    (eventType: "INSERT" | "DELETE", row: { message_id: string; user_id: string; emoji: string } | null) => {
      if (!row) return;
      setByMessage((prev) => {
        const list = [...(prev[row.message_id] ?? [])];
        const idx = list.findIndex((a) => a.emoji === row.emoji);
        if (eventType === "INSERT") {
          if (idx === -1) {
            list.push({
              emoji: row.emoji,
              count: 1,
              users: [row.user_id],
              userReacted: row.user_id === user?.id,
            });
          } else {
            const a = list[idx];
            if (!a.users.includes(row.user_id)) {
              a.count += 1;
              a.users.push(row.user_id);
              if (row.user_id === user?.id) a.userReacted = true;
            }
          }
        } else if (eventType === "DELETE") {
          if (idx !== -1) {
            const a = list[idx];
            a.count -= 1;
            a.users = a.users.filter((u) => u !== row.user_id);
            if (row.user_id === user?.id) a.userReacted = false;
            if (a.count <= 0) list.splice(idx, 1);
          }
        }
        return { ...prev, [row.message_id]: list };
      });
    },
    [user?.id],
  );

  return { byMessage, toggleReaction, handleRealtimeReaction };
}
