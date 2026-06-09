import { supabase } from "@/integrations/supabase/client";

export type RoomNotifyEvent = "signal_created" | "tp_hit" | "sl_hit" | "mention" | "chat";

export interface NotifyRoomEventParams {
  room_id: string;
  event: RoomNotifyEvent;
  signal_id?: string;
  actor_id?: string;
  summary?: string;
}

/** Fan out a room-scoped notification via the notify-room-event edge function. */
export async function notifyRoomEvent(params: NotifyRoomEventParams): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("notify-room-event", {
      body: params,
    });
    if (error) {
      console.warn("[notifyRoomEvent]", error.message);
    }
  } catch (e) {
    console.warn("[notifyRoomEvent]", e);
  }
}
