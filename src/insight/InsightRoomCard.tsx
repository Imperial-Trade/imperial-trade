import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Coins,
  Crown,
  Globe,
  Lock,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { RoomListItem } from '@/hooks/pattern-stream/useRoomList';
import { cn } from '@/lib/utils';

interface InsightRoomCardProps {
  room: RoomListItem;
  onJoin?: (room: RoomListItem) => void;
  onOpen?: (room: RoomListItem) => void;
  joinedStatus?: 'active' | 'pending' | null;
  index?: number;
}

function formatRelative(iso: string | null | undefined) {
  if (!iso) return 'No signals yet';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

/**
 * Insight chip: same proportions as Pattern Stream `.ps-chip` (h=22px, 10px x-padding,
 * 6px gap, 12px font) but uses Insight neutral tokens. Variants below override border/text
 * for accents (matches `.ps-chip-yellow-green` / `.ps-chip-green` / `.ps-chip-warning`).
 */
const chipBase =
  'inline-flex items-center gap-1.5 h-[22px] rounded-full border px-2.5 text-[12px] font-medium whitespace-nowrap';
const chipNeutral = 'border-border/60 bg-muted/40 text-muted-foreground';
const chipYellowGreen =
  'border-lime-400/40 bg-muted/40 text-lime-600 dark:text-lime-400';
const chipGreen =
  'border-emerald-500/35 bg-muted/40 text-emerald-600 dark:text-emerald-400';
const chipWarning =
  'border-amber-500/40 bg-muted/40 text-amber-600 dark:text-amber-400';

function StatCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'positive' | 'negative';
}) {
  return (
    <div className="min-w-0">
      <div className="truncate text-[10px] uppercase tracking-wide text-muted-foreground/80">
        {label}
      </div>
      <div
        className={cn(
          'tabular-nums truncate text-[15px] font-semibold leading-tight',
          tone === 'positive'
            ? 'text-emerald-600 dark:text-emerald-400'
            : tone === 'negative'
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-foreground'
        )}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * Insight-styled discover room card. Same data as `RoomCard` (Pattern Stream)
 * but using Insight flat-feed tokens (no `liquid-glass`, no `--ps-*`).
 */
export function InsightRoomCard({
  room,
  onJoin,
  onOpen,
  joinedStatus,
  index = 0,
}: InsightRoomCardProps) {
  const navigate = useNavigate();
  const stats = room.stats;
  const isPaid = room.monetization === 'paid';
  const isPrivate = room.type === 'private';
  const winRate = stats?.win_rate ?? 0;

  const handleClick = () => {
    if (joinedStatus === 'active') {
      onOpen?.(room);
      navigate(
        `/dashboard/pattern-stream/room/${room.id}/chat?from=insight`,
      );
      return;
    }
    onJoin?.(room);
  };

  const initial = (room.name ?? 'R').charAt(0).toUpperCase();

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: Math.min(index * 0.03, 0.36),
        duration: 0.22,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileTap={{ scale: 0.995 }}
      className={cn(
        'w-full text-left rounded-2xl border border-border/60 bg-card/40 p-4 shadow-sm',
        'transition-colors hover:bg-muted/30',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-0'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            'bg-muted/60 text-sm font-semibold text-foreground ring-1 ring-border/60'
          )}
        >
          {room.avatar_url ? (
            <img
              src={room.avatar_url}
              alt={room.name ?? 'Room'}
              className="h-full w-full rounded-xl object-cover"
            />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold leading-snug text-foreground">
              {room.name ?? 'Room'}
            </h3>
            <span className={cn(chipBase, chipNeutral)}>
              {isPrivate ? (
                <Lock className="h-3 w-3" aria-hidden />
              ) : (
                <Globe className="h-3 w-3" aria-hidden />
              )}
              {isPrivate ? 'Private' : 'Public'}
            </span>
            {isPaid ? (
              <span className={cn(chipBase, chipYellowGreen)}>
                <Coins className="h-3 w-3" aria-hidden />
                Paid
              </span>
            ) : null}
            {joinedStatus === 'active' ? (
              <span className={cn(chipBase, chipGreen)}>
                <Crown className="h-3 w-3" aria-hidden />
                Joined
              </span>
            ) : null}
            {joinedStatus === 'pending' ? (
              <span className={cn(chipBase, chipWarning)}>Pending</span>
            ) : null}
          </div>
          <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
            {room.description ?? 'No description'}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-3">
        <StatCell
          label="Win rate"
          value={`${winRate}%`}
          tone={winRate >= 50 ? 'positive' : undefined}
        />
        <StatCell
          label="Pips +"
          value={(stats?.pips_gained ?? 0).toFixed(1)}
          tone="positive"
        />
        <StatCell
          label="Pips -"
          value={(stats?.pips_lost ?? 0).toFixed(1)}
          tone="negative"
        />
        <StatCell
          label="Signals"
          value={(stats?.total_signals ?? 0).toString()}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className={cn(chipBase, chipNeutral)}>
          <Users className="h-3 w-3" aria-hidden />
          {(stats?.active_members ?? 0).toLocaleString()} members
        </span>
        <span className={cn(chipBase, chipNeutral)}>
          <Activity className="h-3 w-3" aria-hidden />
          {formatRelative(stats?.last_signal_at)}
        </span>
        {winRate >= 50 ? (
          <span className={cn(chipBase, chipYellowGreen)}>
            <TrendingUp className="h-3 w-3" aria-hidden />
            Top performer
          </span>
        ) : null}
      </div>
    </motion.button>
  );
}
