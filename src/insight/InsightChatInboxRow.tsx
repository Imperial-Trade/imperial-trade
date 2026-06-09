import { formatInboxMessageSnippet, type RoomMessagePreview } from "@/hooks/pattern-stream/useRoomLastMessagePreviews";
import type { JoinedRoomListItem } from "@/hooks/pattern-stream/useJoinedRoomList";
import { cn } from "@/lib/utils";
import { INSIGHT_FOCUS_RING } from "@/insight/insightCardTokens";

export function formatChatListTimestamp(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameCalendarDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameCalendarDay) {
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function latestActivityIso(
  room: JoinedRoomListItem,
  preview: RoomMessagePreview | undefined,
): string | null {
  const fromMsg = preview?.created_at;
  const fromSignal = room.stats?.last_signal_at ?? null;
  const fromRoom = room.updated_at ?? null;
  const candidates = [fromMsg, fromSignal, fromRoom].filter(Boolean) as string[];
  if (candidates.length === 0) return null;
  return candidates.reduce((best, cur) =>
    new Date(cur).getTime() > new Date(best).getTime() ? cur : best,
  );
}

interface InsightChatInboxRowProps {
  room: JoinedRoomListItem;
  preview: RoomMessagePreview | undefined;
  currentUserId: string | undefined;
  showUnreadDot: boolean;
  onOpen: (room: JoinedRoomListItem) => void;
  index: number;
}

export function InsightChatInboxRow({
  room,
  preview,
  currentUserId,
  showUnreadDot,
  onOpen,
  index,
}: InsightChatInboxRowProps) {
  const initial = (room.name ?? "R").charAt(0).toUpperCase();
  const snippet = preview
    ? formatInboxMessageSnippet(preview.type, preview.content, {
        userId: currentUserId,
        messageUserId: preview.user_id,
        authorName: preview.authorName,
      })
    : room.description?.trim() || "No messages yet";

  const activityIso = latestActivityIso(room, preview);
  const timeLabel = formatChatListTimestamp(activityIso);

  return (
    <button
      type="button"
      onClick={() => onOpen(room)}
      className={cn(
        "flex w-full items-center gap-3 border-b border-border/50 py-3 text-left transition-colors",
        "hover:bg-muted/25 active:bg-muted/35",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-0",
        INSIGHT_FOCUS_RING,
      )}
      style={{ animationDelay: `${Math.min(index * 24, 320)}ms` }}
    >
      <div className="relative shrink-0">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center overflow-hidden rounded-full",
            "bg-muted/60 text-sm font-semibold text-foreground ring-1 ring-border/60",
          )}
        >
          {room.avatar_url ? (
            <img
              src={room.avatar_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span aria-hidden>{initial}</span>
          )}
        </div>
        {room.joinedStatus === "active" ? (
          <span
            className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-500"
            aria-hidden
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline justify-between gap-2">
          <span className="truncate text-[15px] font-semibold text-foreground">
            {room.name ?? "Room"}
          </span>
          {timeLabel ? (
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {timeLabel}
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex min-w-0 items-center justify-between gap-2">
          <span className="truncate text-sm text-muted-foreground">{snippet}</span>
          {showUnreadDot ? (
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full bg-sky-500 dark:bg-sky-400"
              aria-label="Unread"
            />
          ) : null}
        </div>
      </div>
    </button>
  );
}

export { latestActivityIso };
