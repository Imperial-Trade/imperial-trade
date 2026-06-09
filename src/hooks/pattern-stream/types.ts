import type { Database } from "@/integrations/supabase/types";

export type Room = Database["public"]["Tables"]["rooms"]["Row"];
export type RoomInsert = Database["public"]["Tables"]["rooms"]["Insert"];
export type RoomUpdate = Database["public"]["Tables"]["rooms"]["Update"];

export type RoomMember = Database["public"]["Tables"]["room_members"]["Row"];
export type RoomMemberRole = Database["public"]["Enums"]["room_role"];
export type RoomMemberStatus = Database["public"]["Enums"]["room_member_status"];

export type RoomMessage = Database["public"]["Tables"]["room_messages"]["Row"];
export type RoomMessageType = Database["public"]["Enums"]["room_message_type"];

export type RoomSignal = Database["public"]["Tables"]["room_signals"]["Row"];
export type RoomSignalStatus = Database["public"]["Enums"]["room_signal_status"];

export type RoomInvite = Database["public"]["Tables"]["room_invites"]["Row"];
export type RoomAuditEvent = Database["public"]["Tables"]["room_audit_events"]["Row"];
export type RoomAssetRequest = Database["public"]["Tables"]["room_asset_requests"]["Row"];
export type RoomNotificationPrefs = Database["public"]["Tables"]["room_notification_prefs"]["Row"];

export interface RoomStats {
  room_id: string;
  name: string | null;
  type: "public" | "private" | null;
  monetization: string | null;
  capacity: number | null;
  active_members: number;
  total_signals: number;
  wins: number;
  losses: number;
  pips_gained: number;
  pips_lost: number;
  win_rate: number;
  last_signal_at: string | null;
}

export type SortKey = "trending" | "top_performance" | "most_active" | "newest";
