import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Room, RoomMember, RoomMemberStatus } from "./types";

export interface JoinPublicArgs {
  room: Room;
  rulesAccepted: boolean;
}

export interface JoinPrivateArgs {
  room: Room;
  inviteSelfReferral?: string | null;
  invitedBy?: string | null;
  inviteToken?: string | null;
  rulesAccepted: boolean;
}

export interface JoinResult {
  member: RoomMember;
  status: RoomMemberStatus;
}

export function useJoinRoom() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const publicJoin = useMutation({
    mutationFn: async ({ room, rulesAccepted }: JoinPublicArgs): Promise<JoinResult> => {
      if (!user) throw new Error("Not authenticated");
      if (!rulesAccepted) throw new Error("Rules must be accepted");

      const { data, error } = await supabase
        .from("room_members")
        .upsert(
          {
            room_id: room.id,
            user_id: user.id,
            role: "member",
            status: "active",
            joined_at: new Date().toISOString(),
            rules_accepted_at: new Date().toISOString(),
          },
          { onConflict: "room_id,user_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return { member: data as RoomMember, status: "active" };
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["pattern-stream", "membership", vars.room.id] });
      qc.invalidateQueries({ queryKey: ["pattern-stream", "my-rooms"] });
    },
  });

  const privateJoin = useMutation({
    mutationFn: async (args: JoinPrivateArgs): Promise<JoinResult> => {
      if (!user) throw new Error("Not authenticated");
      const { room, inviteSelfReferral, invitedBy, inviteToken, rulesAccepted } = args;
      if (!rulesAccepted) throw new Error("Rules must be accepted");

      // If invite token provided, validate + bump used_count via RPC-like update.
      let invitedVia: "code" | "link" | "qr" | null = null;
      if (inviteToken) {
        const { data: invite, error: inviteErr } = await supabase
          .from("room_invites")
          .select("id, type, expires_at, max_uses, used_count, revoked_at, room_id")
          .eq("token", inviteToken)
          .eq("room_id", room.id)
          .maybeSingle();
        if (inviteErr) throw inviteErr;
        if (!invite) throw new Error("Invite not found");
        if (invite.revoked_at) throw new Error("Invite has been revoked");
        if (invite.expires_at && new Date(invite.expires_at) < new Date())
          throw new Error("Invite expired");
        if (invite.max_uses != null && invite.used_count >= invite.max_uses)
          throw new Error("Invite usage limit reached");
        invitedVia = invite.type as "code" | "link" | "qr";
      }

      const { data, error } = await supabase
        .from("room_members")
        .upsert(
          {
            room_id: room.id,
            user_id: user.id,
            role: "member",
            status: "pending",
            invited_by: invitedBy ?? null,
            invited_via: invitedVia,
            invite_self_referral: inviteSelfReferral ?? null,
            joined_at: new Date().toISOString(),
            rules_accepted_at: new Date().toISOString(),
          },
          { onConflict: "room_id,user_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return { member: data as RoomMember, status: "pending" };
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["pattern-stream", "membership", vars.room.id] });
      qc.invalidateQueries({ queryKey: ["pattern-stream", "my-rooms"] });
    },
  });

  return { publicJoin, privateJoin };
}
