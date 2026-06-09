// =====================================================================
// Pattern Stream Rooms - notify-room-event
// ---------------------------------------------------------------------
// Fans out a room event (signal_created / tp_hit / sl_hit / mention)
// to all members opted-in via room_notification_prefs and writes a
// user_notifications row per recipient.
// =====================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface NotifyBody {
  room_id: string;
  event: "signal_created" | "tp_hit" | "sl_hit" | "mention" | "chat";
  signal_id?: string;
  message_id?: string;
  actor_id?: string;
  summary?: string;
}

function mapNotificationType(event: NotifyBody["event"]): string {
  switch (event) {
    case "signal_created":
      return "new_signal";
    case "sl_hit":
      return "stop_loss";
    case "tp_hit":
      return "tp_hit";
    case "mention":
      return "notes_updated";
    case "chat":
      return "notes_updated";
    default:
      return "new_signal";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as NotifyBody;
    if (!body.room_id || !body.event) {
      return new Response(
        JSON.stringify({ error: "room_id and event are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: roomRow } = await supabase
      .from("rooms")
      .select("name")
      .eq("id", body.room_id)
      .maybeSingle();

    let signalSummary = body.summary;
    if (body.signal_id) {
      const { data: sig } = await supabase
        .from("room_signals")
        .select("symbol, side")
        .eq("id", body.signal_id)
        .maybeSingle();
      if (sig?.symbol) {
        signalSummary =
          body.summary ??
          `${sig.symbol} ${String(sig.side ?? "").toUpperCase()}`.trim();
      }
    }

    const prefField =
      body.event === "tp_hit"
        ? "tp"
        : body.event === "sl_hit"
        ? "sl"
        : body.event === "mention"
        ? "mentions"
        : body.event === "chat"
        ? "chat"
        : "signals";

    const { data: members, error: mErr } = await supabase
      .from("room_members")
      .select("user_id, role, status")
      .eq("room_id", body.room_id)
      .eq("status", "active");

    if (mErr) throw mErr;
    const memberIds = (members ?? []).map((m) => m.user_id).filter((u) => u !== body.actor_id);

    if (memberIds.length === 0) {
      return new Response(JSON.stringify({ delivered: 0, reason: "no_members" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: prefRows } = await supabase
      .from("room_notification_prefs")
      .select("user_id, signals, tp, sl, mentions, chat")
      .eq("room_id", body.room_id)
      .in("user_id", memberIds);

    const prefMap = new Map((prefRows ?? []).map((p) => [p.user_id, p as Record<string, unknown>]));

    const recipients = memberIds.filter((id) => {
      const p = prefMap.get(id);
      if (!p) {
        if (prefField === "chat") return false;
        return true;
      }
      return p[prefField] === true;
    });

    const roomTitle = roomRow?.name ?? "Room";
    const linkUrl = `/dashboard/pattern-stream/room/${body.room_id}/chat?from=insight`;

    const summary =
      signalSummary ??
      (body.event === "signal_created"
        ? "New signal posted in your room"
        : body.event === "tp_hit"
        ? "Take profit hit"
        : body.event === "sl_hit"
        ? "Stop loss hit"
        : body.event === "mention"
        ? "You were mentioned"
        : "New chat in your room");

    const notificationType = mapNotificationType(body.event);

    const insertRows = recipients.map((uid) => ({
      user_id: uid,
      notification_type: notificationType,
      title: roomTitle,
      message: summary,
      link_url: linkUrl,
      metadata: {
        room_id: body.room_id,
        signal_id: body.signal_id ?? null,
        message_id: body.message_id ?? null,
        event: body.event,
        link_url: linkUrl,
      },
      delivery_channel: "realtime",
      priority: 1,
      created_at: new Date().toISOString(),
    }));

    if (insertRows.length > 0) {
      const { error: insErr } = await supabase.from("user_notifications").insert(insertRows);
      if (insErr) console.error("[notify-room-event] insert error:", insErr);
    }

    return new Response(
      JSON.stringify({ delivered: recipients.length, total_members: memberIds.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[notify-room-event] error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
