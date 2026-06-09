import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRoomRealtime } from "./useRoomRealtime";
import type { RoomMessage, RoomSignal } from "./types";

export interface ChatMessage extends RoomMessage {
  /** Local-only marker for optimistic messages (not yet persisted) */
  _optimistic?: boolean;
  _send_status?: "sending" | "sent" | "delivered" | "read" | "failed";
  _temp_id?: string;
}

export type RoomMessageRealtimePayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
};

export interface UseRoomMessagesOptions {
  roomId: string | undefined;
  pageSize?: number;
  /** When true, parent owns a single `useRoomRealtime` and wires `handleRealtimeMessage`. */
  externalRealtime?: boolean;
}

const DEFAULT_PAGE = 50;

/**
 * Ensures messages are ascending by `created_at`. Realtime INSERT and optimistic
 * sends both append to the tail, but a slightly-older server timestamp can land
 * after a newer optimistic row — so we re-sort after every append/replace path.
 */
function sortByCreatedAt(list: ChatMessage[]): ChatMessage[] {
  return [...list].sort((a, b) => {
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    if (ta !== tb) return ta - tb;
    const ka = a._temp_id ?? a.id;
    const kb = b._temp_id ?? b.id;
    return ka.localeCompare(kb);
  });
}

export function useRoomMessages({
  roomId,
  pageSize = DEFAULT_PAGE,
  externalRealtime = false,
}: UseRoomMessagesOptions) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const oldestRef = useRef<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Initial load
  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setMessages([]);
    oldestRef.current = null;

    (async () => {
      try {
        const { data, error: err } = await supabase
          .from("room_messages")
          .select("*")
          .eq("room_id", roomId)
          .is("deleted_for", null)
          .order("created_at", { ascending: false })
          .limit(pageSize);
        if (err) throw err;
        if (cancelled) return;
        const list = sortByCreatedAt(
          ((data ?? []) as RoomMessage[]) as ChatMessage[],
        );
        setMessages(list);
        setHasMore((data ?? []).length === pageSize);
        if (list.length > 0) oldestRef.current = list[0].created_at;
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roomId, pageSize]);

  const loadOlder = useCallback(async () => {
    if (!roomId || !oldestRef.current || !hasMore) return;
    const beforeIso = oldestRef.current;
    const { data, error: err } = await supabase
      .from("room_messages")
      .select("*")
      .eq("room_id", roomId)
      .is("deleted_for", null)
      .lt("created_at", beforeIso)
      .order("created_at", { ascending: false })
      .limit(pageSize);
    if (err) {
      setError(err.message);
      return;
    }
    const more = ((data ?? []) as RoomMessage[]) as ChatMessage[];
    if (more.length > 0) {
      setMessages((prev) => sortByCreatedAt([...more, ...prev]));
      const sortedMore = sortByCreatedAt(more);
      oldestRef.current = sortedMore[0].created_at;
    }
    setHasMore((data ?? []).length === pageSize);
  }, [roomId, hasMore, pageSize]);

  const handleRealtimeMessage = useCallback(
    ({ eventType, new: row, old }: RoomMessageRealtimePayload) => {
      if (eventType === "INSERT" && row) {
        const rec = row as ChatMessage;
        setMessages((prev) => {
          const idx = prev.findIndex(
            (m) =>
              m._optimistic &&
              m.user_id === rec.user_id &&
              m.type === rec.type &&
              JSON.stringify(m.content) === JSON.stringify(rec.content),
          );
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...rec, _send_status: "sent" } as ChatMessage;
            return sortByCreatedAt(next);
          }
          if (prev.some((m) => m.id === rec.id)) return prev;
          return sortByCreatedAt([...prev, rec]);
        });
      }
      if (eventType === "UPDATE" && row) {
        const rec = row as ChatMessage;
        setMessages((prev) =>
          sortByCreatedAt(prev.map((m) => (m.id === rec.id ? { ...m, ...rec } : m))),
        );
      }
      if (eventType === "DELETE" && old) {
        const id = (old as { id?: string }).id;
        if (id) setMessages((prev) => prev.filter((m) => m.id !== id));
      }
    },
    [],
  );

  useRoomRealtime(
    externalRealtime ? undefined : roomId,
    externalRealtime ? undefined : user?.id,
    externalRealtime
      ? {}
      : {
          onMessage: handleRealtimeMessage,
        },
  );

  const sendText = useCallback(
    async (text: string, parentMessageId?: string | null) => {
      if (!user || !roomId || !text.trim()) return;
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const optimistic: ChatMessage = {
        id: tempId,
        room_id: roomId,
        user_id: user.id,
        parent_message_id: parentMessageId ?? null,
        type: "text",
        content: { text: text.trim() },
        signal_id: null,
        audit_event_id: null,
        edited_at: null,
        deleted_for: null,
        deleted_at: null,
        deleted_by: null,
        created_at: new Date().toISOString(),
        _optimistic: true,
        _send_status: "sending",
        _temp_id: tempId,
      };
      setMessages((prev) => sortByCreatedAt([...prev, optimistic]));

      try {
        const { error: err } = await supabase.from("room_messages").insert({
          room_id: roomId,
          user_id: user.id,
          parent_message_id: parentMessageId ?? null,
          type: "text",
          content: { text: text.trim() },
        });
        if (err) throw err;
        // Realtime INSERT will reconcile and replace the optimistic row.
      } catch (e) {
        setMessages((prev) =>
          prev.map((m) => (m._temp_id === tempId ? { ...m, _send_status: "failed" } : m)),
        );
        throw e;
      }
    },
    [roomId, user],
  );

  const editMessage = useCallback(
    async (messageId: string, text: string) => {
      const { error: err } = await supabase
        .from("room_messages")
        .update({ content: { text }, edited_at: new Date().toISOString() })
        .eq("id", messageId);
      if (err) throw err;
    },
    [],
  );

  const deleteMessage = useCallback(
    async (messageId: string, scope: "self" | "all") => {
      const { error: err } = await supabase
        .from("room_messages")
        .update({
          deleted_for: scope,
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id ?? null,
        })
        .eq("id", messageId);
      if (err) throw err;
    },
    [user],
  );

  /**
   * Retry a failed optimistic send in place — flips the message back to
   * `sending` and re-issues the INSERT. Used by failed-message ticks (audit C4).
   */
  const retrySend = useCallback(async (tempId: string) => {
    const msg = messagesRef.current.find(
      (m) => m._temp_id === tempId || m.id === tempId,
    );
    if (!msg || !msg._optimistic) return;
    setMessages((prev) =>
      prev.map((m) =>
        (m._temp_id === tempId || m.id === tempId)
          ? { ...m, _send_status: "sending" }
          : m,
      ),
    );
    try {
      const { error: err } = await supabase.from("room_messages").insert({
        room_id: msg.room_id,
        user_id: msg.user_id,
        parent_message_id: msg.parent_message_id ?? null,
        type: msg.type,
        content: msg.content as object,
      });
      if (err) throw err;
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) =>
          (m._temp_id === tempId || m.id === tempId)
            ? { ...m, _send_status: "failed" }
            : m,
        ),
      );
      console.warn("[ps-chat] retry failed", e);
    }
  }, []);

  /**
   * After `room_signals` insert, ensure the paired `room_messages` row (type `signal`)
   * is in local state. Handles missing DB triggers and realtime gaps.
   */
  const ensureSignalChatMessage = useCallback(
    async (signal: RoomSignal) => {
      if (!roomId) return;

      const { data: existing, error: fetchErr } = await supabase
        .from("room_messages")
        .select("*")
        .eq("room_id", roomId)
        .eq("signal_id", signal.id)
        .eq("type", "signal")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (fetchErr) {
        console.warn("[ps-chat] signal message fetch failed", fetchErr);
      }

      let msg = (existing ?? null) as RoomMessage | null;

      if (!msg) {
        const { data: inserted, error: insErr } = await supabase
          .from("room_messages")
          .insert({
            room_id: signal.room_id,
            user_id: signal.provider_id,
            type: "signal",
            signal_id: signal.id,
            content: {
              symbol: signal.symbol,
              side: signal.side,
              entry: signal.entry,
              sl: signal.sl,
              tps: Array.isArray(signal.tps) ? signal.tps : [],
              status: signal.status,
            },
          })
          .select("*")
          .single();

        if (insErr) {
          const { data: retry } = await supabase
            .from("room_messages")
            .select("*")
            .eq("room_id", roomId)
            .eq("signal_id", signal.id)
            .eq("type", "signal")
            .limit(1)
            .maybeSingle();
          msg = (retry ?? null) as RoomMessage | null;
          if (!msg) {
            console.warn("[ps-chat] signal message insert failed", insErr);
            return;
          }
        } else {
          msg = inserted as RoomMessage;
        }
      }

      setMessages((prev) => {
        if (prev.some((m) => m.id === msg!.id)) return prev;
        return sortByCreatedAt([...prev, msg as ChatMessage]);
      });
    },
    [roomId],
  );

  return {
    messages,
    loading,
    error,
    hasMore,
    loadOlder,
    sendText,
    editMessage,
    deleteMessage,
    retrySend,
    ensureSignalChatMessage,
    handleRealtimeMessage,
  };
}
