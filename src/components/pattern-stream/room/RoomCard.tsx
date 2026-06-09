import { motion } from "framer-motion";
import { Users, ChartLineUp, Lock, Globe, CrownSimple, Coins } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { LivePulseDot } from "@/components/pattern-stream/indicators/PresenceDot";
import type { RoomListItem } from "@/hooks/pattern-stream/useRoomList";

interface RoomCardProps {
  room: RoomListItem;
  onJoin?: (room: RoomListItem) => void;
  onOpen?: (room: RoomListItem) => void;
  joinedStatus?: "active" | "pending" | null;
  index?: number;
}

function formatRelative(iso: string | null | undefined) {
  if (!iso) return "No signals yet";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export function RoomCard({ room, onJoin, onOpen, joinedStatus, index = 0 }: RoomCardProps) {
  const navigate = useNavigate();
  const stats = room.stats;
  const isPaid = room.monetization === "paid";
  const isPrivate = room.type === "private";
  const isLive = stats?.last_signal_at
    ? Date.now() - new Date(stats.last_signal_at).getTime() < 1000 * 60 * 60 * 6
    : false;

  const handleClick = () => {
    if (joinedStatus === "active") {
      onOpen?.(room);
      navigate(`/dashboard/pattern-stream/room/${room.id}/chat`);
      return;
    }
    onJoin?.(room);
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: Math.min(index * 0.03, 0.36),
        duration: 0.24,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileTap={{ scale: 0.99 }}
      className="liquid-glass w-full text-left"
      style={{ padding: 16, borderRadius: 20, minHeight: 190, cursor: "pointer" }}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 flex items-center justify-center font-semibold"
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background:
              "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(164,230,53,0.10))",
            color: "var(--ps-text)",
            border: "1px solid var(--ps-border-subtle)",
          }}
        >
          {room.avatar_url ? (
            <img
              src={room.avatar_url}
              alt={room.name}
              style={{ width: "100%", height: "100%", borderRadius: 12, objectFit: "cover" }}
            />
          ) : (
            <span>{(room.name ?? "R").charAt(0).toUpperCase()}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className="truncate"
              style={{ fontSize: 16, lineHeight: "22px", fontWeight: 600, color: "var(--ps-text)" }}
            >
              {room.name}
            </h3>
            <span className="ps-chip" style={{ height: 22, fontSize: 11 }}>
              {isPrivate ? <Lock size={12} weight="fill" /> : <Globe size={12} weight="fill" />}
              {isPrivate ? "Private" : "Public"}
            </span>
            {isPaid && (
              <span className="ps-chip ps-chip-yellow-green" style={{ height: 22, fontSize: 11 }}>
                <Coins size={12} weight="fill" />
                Paid
              </span>
            )}
            {joinedStatus === "active" && (
              <span className="ps-chip ps-chip-green" style={{ height: 22, fontSize: 11 }}>
                <CrownSimple size={12} weight="fill" />
                Joined
              </span>
            )}
            {joinedStatus === "pending" && (
              <span className="ps-chip ps-chip-warning" style={{ height: 22, fontSize: 11 }}>
                Pending
              </span>
            )}
          </div>
          <p
            className="truncate mt-0.5"
            style={{ fontSize: 13, color: "var(--ps-text-tertiary)" }}
          >
            {room.description ?? "No description"}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2 mt-4">
        <Stat label="Win rate" value={`${stats?.win_rate ?? 0}%`} accent={(stats?.win_rate ?? 0) >= 50 ? "green" : undefined} />
        <Stat label="Pips +" value={(stats?.pips_gained ?? 0).toFixed(1)} accent="green" />
        <Stat label="Pips -" value={(stats?.pips_lost ?? 0).toFixed(1)} accent="negative" />
        <Stat label="Signals" value={(stats?.total_signals ?? 0).toString()} />
      </div>

      {/* Footer row */}
      <div className="flex items-center gap-2 flex-wrap mt-4">
        <span className="ps-chip">
          <Users size={12} />
          {(stats?.active_members ?? 0).toLocaleString()} members
        </span>
        <span className="ps-chip">
          <ChartLineUp size={12} />
          {formatRelative(stats?.last_signal_at)}
        </span>
        {isLive && (
          <span className="ps-chip ps-chip-yellow-green">
            <LivePulseDot />
            Live
          </span>
        )}
      </div>
    </motion.button>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "green" | "negative";
}) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--ps-text-tertiary)" }}>{label}</div>
      <div
        className="ps-numeric"
        style={{
          fontSize: 15,
          fontWeight: 600,
          color:
            accent === "green"
              ? "var(--ps-green)"
              : accent === "negative"
              ? "var(--ps-negative)"
              : "var(--ps-text)",
        }}
      >
        {value}
      </div>
    </div>
  );
}
