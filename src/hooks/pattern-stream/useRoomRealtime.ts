import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { RealtimeStatus } from "@/components/pattern-stream/indicators/ConnectionBanner";

export interface RoomRealtimeEvents {
  onMessage?: (payload: { eventType: "INSERT" | "UPDATE" | "DELETE"; new: Record<string, unknown> | null; old: Record<string, unknown> | null }) => void;
  onReaction?: (payload: { eventType: "INSERT" | "UPDATE" | "DELETE"; new: Record<string, unknown> | null; old: Record<string, unknown> | null }) => void;
  onSignal?: (payload: { eventType: "INSERT" | "UPDATE" | "DELETE"; new: Record<string, unknown> | null; old: Record<string, unknown> | null }) => void;
  onSignalUpdate?: (payload: { eventType: "INSERT"; new: Record<string, unknown> | null }) => void;
  onAudit?: (payload: { eventType: "INSERT"; new: Record<string, unknown> | null }) => void;
  onMember?: (payload: { eventType: "INSERT" | "UPDATE" | "DELETE"; new: Record<string, unknown> | null; old: Record<string, unknown> | null }) => void;
  onPresenceSync?: (state: Record<string, Array<{ user_id?: string; typing?: boolean }>>) => void;
  onTyping?: (payload: { user_id: string; is_typing: boolean }) => void;
}

/**
 * Subscribes to per-room realtime channels for messages, reactions,
 * signals, signal updates, audit events, members, and presence.
 *
 * Returns connection status (online/reconnecting/offline) used by
 * ConnectionBanner.
 */
export function useRoomRealtime(roomId: string | undefined, userId: string | undefined, events: RoomRealtimeEvents = {}) {
  const [status, setStatus] = useState<RealtimeStatus>("online");
  const channels = useRef<RealtimeChannel[]>([]);
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    if (!roomId) return;
    setStatus("reconnecting");

    const dbCh = supabase.channel(`room:${roomId}:db`, { config: { broadcast: { ack: true } } });

    dbCh
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          eventsRef.current.onMessage?.({
            eventType: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
            new: (payload.new as Record<string, unknown> | null) ?? null,
            old: (payload.old as Record<string, unknown> | null) ?? null,
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_message_reactions" },
        (payload) => {
          eventsRef.current.onReaction?.({
            eventType: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
            new: (payload.new as Record<string, unknown> | null) ?? null,
            old: (payload.old as Record<string, unknown> | null) ?? null,
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_signals", filter: `room_id=eq.${roomId}` },
        (payload) => {
          eventsRef.current.onSignal?.({
            eventType: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
            new: (payload.new as Record<string, unknown> | null) ?? null,
            old: (payload.old as Record<string, unknown> | null) ?? null,
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "room_signal_updates" },
        (payload) => {
          eventsRef.current.onSignalUpdate?.({
            eventType: "INSERT",
            new: (payload.new as Record<string, unknown> | null) ?? null,
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "room_audit_events", filter: `room_id=eq.${roomId}` },
        (payload) => {
          eventsRef.current.onAudit?.({
            eventType: "INSERT",
            new: (payload.new as Record<string, unknown> | null) ?? null,
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_members", filter: `room_id=eq.${roomId}` },
        (payload) => {
          eventsRef.current.onMember?.({
            eventType: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
            new: (payload.new as Record<string, unknown> | null) ?? null,
            old: (payload.old as Record<string, unknown> | null) ?? null,
          });
        },
      )
      .subscribe((s) => {
        if (s === "SUBSCRIBED") setStatus("online");
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") setStatus("reconnecting");
        else if (s === "CLOSED") setStatus("offline");
      });

    // Presence channel: each member tracks their online + typing state
    const presenceCh = supabase.channel(`room:${roomId}:presence`, {
      config: { presence: { key: userId ?? "anon" } },
    });

    presenceCh
      .on("presence", { event: "sync" }, () => {
        const state = presenceCh.presenceState() as Record<
          string,
          Array<{ user_id?: string; typing?: boolean }>
        >;
        eventsRef.current.onPresenceSync?.(state);
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const p = payload as { user_id: string; is_typing: boolean };
        eventsRef.current.onTyping?.(p);
      })
      .subscribe(async (s) => {
        if (s === "SUBSCRIBED" && userId) {
          await presenceCh.track({ user_id: userId, online_at: new Date().toISOString() });
        }
      });

    channels.current = [dbCh, presenceCh];

    return () => {
      channels.current.forEach((ch) => {
        try {
          ch.unsubscribe();
          supabase.removeChannel(ch);
        } catch (err) {
          console.warn("[ps-realtime] cleanup error", err);
        }
      });
      channels.current = [];
    };
  }, [roomId, userId]);

  // Browser-level offline/online
  useEffect(() => {
    const onOnline = () => setStatus((s) => (s === "offline" ? "reconnecting" : s));
    const onOffline = () => setStatus("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const broadcastTyping = (isTyping: boolean) => {
    const presenceCh = channels.current[1];
    if (!presenceCh || !userId) return;
    presenceCh.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: userId, is_typing: isTyping },
    });
  };

  return { status, broadcastTyping };
}
