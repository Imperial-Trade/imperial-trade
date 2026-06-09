import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  XCircle,
  CrownSimple,
  ShieldCheck,
  Lightning,
  User,
  SpeakerSlash,
  ClockCounterClockwise,
  Prohibit,
  ArrowsClockwise,
  CaretDown,
} from "@phosphor-icons/react";
import { useRoomMembers, type RoomMemberWithProfile } from "@/hooks/pattern-stream/useRoomMembers";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RoomLayoutContext } from "./RoomLayout";
import type { RoomMemberRole, RoomMemberStatus } from "@/hooks/pattern-stream/types";

const ROLE_ICON: Record<RoomMemberRole, React.ReactNode> = {
  owner: <CrownSimple size={12} weight="fill" />,
  admin: <ShieldCheck size={12} weight="fill" />,
  provider: <Lightning size={12} weight="fill" />,
  member: <User size={12} />,
};

const STATUS_LABELS: Record<RoomMemberStatus, string> = {
  pending: "Pending",
  active: "Active",
  muted: "Muted",
  timed_out: "Timed out",
  banned: "Banned",
};

export default function MembersTab() {
  const { membership, room, insightCommentsShell } = useOutletContext<RoomLayoutContext>();
  const { toast } = useToast();
  const isOwner = membership?.role === "owner";
  const isStaff =
    isOwner || membership?.role === "admin" || membership?.role === "provider";

  const { members, loading, approve, reject, setRole, setStatus, refresh } = useRoomMembers(room?.id);

  const [filter, setFilter] = useState<"all" | "active" | "pending" | "moderation">("all");

  const filtered = useMemo(() => {
    if (filter === "all") return members;
    if (filter === "active") return members.filter((m) => m.status === "active");
    if (filter === "pending") return members.filter((m) => m.status === "pending");
    return members.filter((m) => m.status === "muted" || m.status === "timed_out" || m.status === "banned");
  }, [members, filter]);

  const guard = async (fn: () => Promise<void>, label: string) => {
    try {
      await fn();
      toast({ title: label });
    } catch (e) {
      toast({
        title: "Action failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className="sticky top-0 z-10 px-3 pb-2 pt-3 sm:px-4"
        style={{ background: insightCommentsShell ? "transparent" : "var(--ps-canvas)" }}
      >
        <div className="flex items-center gap-1 overflow-x-auto">
          {(["all", "active", "pending", "moderation"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="ps-active-pill"
              data-active={filter === f}
              style={{ height: 32 }}
            >
              {f === "all" ? "All" : f === "active" ? "Active" : f === "pending" ? "Pending" : "Moderation"}
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={() => refresh()} className="ps-btn-ghost ps-btn-icon" aria-label="Refresh">
            <ArrowsClockwise size={16} />
          </button>
        </div>
      </div>

      <div className="px-3 sm:px-4 pb-6 flex-1 overflow-y-auto">
        {loading && (
          <div className="space-y-2 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="ps-skeleton" style={{ height: 56, borderRadius: 14 }} />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="liquid-glass text-center py-8" style={{ color: "var(--ps-text-secondary)" }}>
            No members in this view.
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="space-y-2 pt-2">
            {filtered.map((m) => (
              <motion.div
                key={m.user_id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="liquid-glass p-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar member={m} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="truncate"
                        style={{ fontSize: 14, fontWeight: 600, color: "var(--ps-text)" }}
                      >
                        {m.profile?.display_name ?? "Member"}
                      </span>
                      <RoleBadge role={m.role} />
                      <StatusBadge status={m.status} />
                    </div>
                    {m.invite_self_referral && (
                      <p style={{ fontSize: 11, color: "var(--ps-text-tertiary)" }}>
                        Invited via {m.invite_self_referral}
                      </p>
                    )}
                  </div>

                  {isStaff && m.role !== "owner" && (
                    <div className="flex items-center gap-1">
                      {m.status === "pending" && (
                        <>
                          <button
                            className="ps-chip ps-chip-green cursor-pointer"
                            onClick={() => guard(() => approve(m.user_id), "Member approved")}
                            style={{ height: 28 }}
                          >
                            <CheckCircle size={12} weight="fill" />
                            Approve
                          </button>
                          <button
                            className="ps-chip ps-chip-negative cursor-pointer"
                            onClick={() => guard(() => reject(m.user_id), "Member rejected")}
                            style={{ height: 28 }}
                          >
                            <XCircle size={12} weight="fill" />
                            Reject
                          </button>
                        </>
                      )}
                      {m.status !== "pending" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="ps-btn-ghost ps-btn-icon" aria-label="Member actions">
                              <CaretDown size={14} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="liquid-glass"
                            style={{ minWidth: 220, padding: 6 }}
                          >
                            {isOwner && (
                              <>
                                <DropdownItem
                                  active={m.role === "admin"}
                                  icon={<ShieldCheck size={14} />}
                                  label="Make admin"
                                  onSelect={() => guard(() => setRole(m.user_id, "admin"), "Promoted to admin")}
                                />
                                <DropdownItem
                                  active={m.role === "provider"}
                                  icon={<Lightning size={14} />}
                                  label="Make provider"
                                  onSelect={() => guard(() => setRole(m.user_id, "provider"), "Promoted to provider")}
                                />
                                <DropdownItem
                                  active={m.role === "member"}
                                  icon={<User size={14} />}
                                  label="Demote to member"
                                  onSelect={() => guard(() => setRole(m.user_id, "member"), "Demoted")}
                                />
                              </>
                            )}
                            <DropdownItem
                              icon={<SpeakerSlash size={14} />}
                              label={m.status === "muted" ? "Unmute" : "Mute"}
                              onSelect={() =>
                                guard(
                                  () => setStatus(m.user_id, m.status === "muted" ? "active" : "muted"),
                                  m.status === "muted" ? "Member unmuted" : "Member muted",
                                )
                              }
                            />
                            <DropdownItem
                              icon={<ClockCounterClockwise size={14} />}
                              label={m.status === "timed_out" ? "End timeout" : "Timeout 24h"}
                              onSelect={() =>
                                guard(
                                  () =>
                                    setStatus(m.user_id, m.status === "timed_out" ? "active" : "timed_out", {
                                      until: m.status === "timed_out"
                                        ? null
                                        : new Date(Date.now() + 86_400_000).toISOString(),
                                    }),
                                  m.status === "timed_out" ? "Timeout cleared" : "Timed out for 24h",
                                )
                              }
                            />
                            <DropdownItem
                              icon={<Prohibit size={14} />}
                              destructive
                              label={m.status === "banned" ? "Unban" : "Ban"}
                              onSelect={() =>
                                guard(
                                  () =>
                                    setStatus(m.user_id, m.status === "banned" ? "active" : "banned", {
                                      reason: m.status === "banned" ? null : "Banned by staff",
                                    }),
                                  m.status === "banned" ? "Member unbanned" : "Member banned",
                                )
                              }
                            />
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Avatar({ member }: { member: RoomMemberWithProfile }) {
  const name = member.profile?.display_name ?? "M";
  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: 36,
        height: 36,
        borderRadius: 9999,
        background: "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(255,255,255,0.06))",
        border: "1px solid var(--ps-border-subtle)",
        color: "var(--ps-text)",
        fontWeight: 600,
        fontSize: 14,
      }}
    >
      {member.profile?.avatar_url ? (
        <img src={member.profile.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: 9999 }} />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: RoomMemberRole }) {
  return (
    <span
      className="ps-chip"
      style={{
        height: 22,
        fontSize: 10,
        color: role === "owner" ? "var(--ps-yellow-green)" : role === "member" ? "var(--ps-text-tertiary)" : "var(--ps-green)",
        borderColor: role === "owner" ? "var(--ps-yellow-green)" : role === "member" ? undefined : "var(--ps-green)",
      }}
    >
      {ROLE_ICON[role]}
      {role}
    </span>
  );
}

function StatusBadge({ status }: { status: RoomMemberStatus }) {
  if (status === "active") return null;
  const tone =
    status === "pending"
      ? "var(--ps-warning)"
      : status === "banned"
      ? "var(--ps-negative)"
      : "var(--ps-text-tertiary)";
  return (
    <span className="ps-chip" style={{ height: 20, fontSize: 10, color: tone, borderColor: tone }}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function DropdownItem({
  icon,
  label,
  onSelect,
  active,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  onSelect: () => void;
  active?: boolean;
  destructive?: boolean;
}) {
  return (
    <DropdownMenuItem
      onSelect={onSelect}
      className="ps-active-pill w-full justify-start"
      data-active={active ?? false}
      style={{
        borderRadius: 10,
        padding: "8px 12px",
        color: destructive ? "var(--ps-negative)" : undefined,
      }}
    >
      {icon}
      {label}
    </DropdownMenuItem>
  );
}
