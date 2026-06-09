import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Loader2, MoreHorizontal } from 'lucide-react';
import { useJoinedRoomList } from '@/hooks/pattern-stream/useJoinedRoomList';
import { useRoomLastMessagePreviews } from '@/hooks/pattern-stream/useRoomLastMessagePreviews';
import { usePullToRefresh } from '@/hooks/pattern-stream/usePullToRefresh';
import type { SortKey } from '@/hooks/pattern-stream/types';
import type { JoinedRoomListItem } from '@/hooks/pattern-stream/useJoinedRoomList';
import type { RoomMessagePreview } from '@/hooks/pattern-stream/useRoomLastMessagePreviews';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { INSIGHT_CARD_CLASS, INSIGHT_FOCUS_RING } from '@/insight/insightCardTokens';
import { InsightChatInboxRowSkeleton } from '@/insight/InsightChatMessageSkeleton';
import {
  InsightChatInboxRow,
  latestActivityIso,
} from '@/insight/InsightChatInboxRow';
import { readInsightLastVisitedMap } from '@/insight/insightChatLastVisited';
import { queryErrorMessage } from '@/utils/queryErrorMessage';

interface InsightJoinedRoomsProps {
  search: string;
}

type InboxChip = 'all' | 'unread' | 'pending' | 'owned';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'top_performance', label: 'Top performance' },
  { value: 'most_active', label: 'Most active' },
  { value: 'trending', label: 'Recent activity' },
  { value: 'newest', label: 'Recently joined' },
];

function InboxRowSkeleton() {
  return <InsightChatInboxRowSkeleton />;
}

function PullToRefreshSpinner({
  pulling,
  progress,
  refreshing,
}: {
  pulling: boolean;
  progress: number;
  refreshing: boolean;
}) {
  const visible = pulling || refreshing;
  if (!visible) return null;
  const translate = refreshing ? 56 : Math.round(progress * 56);
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-[1] flex justify-center"
      style={{ transform: `translateY(${translate - 24}px)` }}
      aria-hidden
    >
      <div
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card/80 shadow-sm backdrop-blur-sm',
          'text-muted-foreground',
        )}
        style={{ opacity: refreshing ? 1 : Math.max(0.4, progress) }}
      >
        <Loader2
          className={cn('h-4 w-4', refreshing && 'animate-spin')}
          style={{
            transform: refreshing
              ? undefined
              : `rotate(${progress * 360}deg)`,
            transition: 'transform 80ms ease-out',
          }}
          aria-hidden
        />
      </div>
    </div>
  );
}

function chipClass(active: boolean) {
  return cn(
    'shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-0',
    INSIGHT_FOCUS_RING,
    active
      ? 'bg-muted/50 text-foreground ring-1 ring-border/80'
      : 'bg-muted/25 text-muted-foreground hover:bg-muted/40 hover:text-foreground',
  );
}

function isUnreadForStub(
  room: JoinedRoomListItem,
  preview: RoomMessagePreview | undefined,
  lastVisitedIso: string | undefined,
): boolean {
  const activity = latestActivityIso(room, preview);
  if (!activity) {
    return false;
  }
  if (!lastVisitedIso) return true;
  return new Date(activity).getTime() > new Date(lastVisitedIso).getTime();
}

export function InsightJoinedRooms({ search }: InsightJoinedRoomsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sort, setSort] = useState<SortKey>('top_performance');
  const [sortOpen, setSortOpen] = useState(false);
  const [chip, setChip] = useState<InboxChip>('all');
  const [visitTick, setVisitTick] = useState(0);

  useEffect(() => {
    const onVisited = () => setVisitTick((t) => t + 1);
    window.addEventListener("insight-chat-last-visited", onVisited);
    return () => window.removeEventListener("insight-chat-last-visited", onVisited);
  }, []);

  const { data, isLoading, error, refetch } = useJoinedRoomList({
    search,
    sort,
  });
  const qc = useQueryClient();

  const roomIds = useMemo(() => (data ?? []).map((r) => r.id), [data]);
  const { data: previewMap } = useRoomLastMessagePreviews(
    roomIds,
    user?.id,
  );

  const lastVisitedMap = useMemo(() => {
    if (!user?.id) return {};
    void visitTick;
    return readInsightLastVisitedMap(user.id);
  }, [user?.id, visitTick]);

  const ptr = usePullToRefresh({
    onRefresh: async () => {
      await Promise.all([
        refetch(),
        qc.invalidateQueries({ queryKey: ['pattern-stream'] }),
      ]);
    },
  });

  const filteredRooms = useMemo(() => {
    const list = data ?? [];
    if (chip === 'all') return list;
    if (chip === 'pending') {
      return list.filter((r) => r.joinedStatus === 'pending');
    }
    if (chip === 'owned') {
      return list.filter((r) => r.owner_id === user?.id);
    }
    if (chip === 'unread') {
      return list.filter((r) => {
        const preview = previewMap?.get(r.id);
        const last = lastVisitedMap[r.id];
        return isUnreadForStub(r, preview, last);
      });
    }
    return list;
  }, [data, chip, user?.id, previewMap, lastVisitedMap]);

  const count = filteredRooms.length;
  const totalLoaded = data?.length ?? 0;

  const openRoom = useCallback(
    (room: JoinedRoomListItem) => {
      navigate(
        `/dashboard/pattern-stream/room/${room.id}/chat?from=insight`,
      );
    },
    [navigate],
  );

  const errMsg = queryErrorMessage(
    error,
    'Couldn’t load chats. Please try again.',
  );

  return (
    <div className="relative px-3 pt-1 sm:px-4">
      <h1 className="sr-only">My chats</h1>
      <PullToRefreshSpinner
        pulling={ptr.pulling}
        progress={ptr.progress}
        refreshing={ptr.refreshing}
      />

      {!isLoading && !error ? (
        <div className="mb-2 flex items-center gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(
            [
              ['all', 'All'],
              ['unread', 'Unread'],
              ['pending', 'Pending'],
              ['owned', 'Owned'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setChip(key)}
              className={chipClass(chip === key)}
            >
              {label}
            </button>
          ))}
          <Drawer open={sortOpen} onOpenChange={setSortOpen}>
            <DrawerTrigger asChild>
              <button
                type="button"
                className={chipClass(false)}
                aria-label="Sort and more options"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden />
              </button>
            </DrawerTrigger>
            <DrawerContent
              className={cn(
                'border-border/60 bg-background backdrop-blur-md',
                'pb-[max(1rem,env(safe-area-inset-bottom))]',
              )}
            >
              <DrawerHeader className="px-4">
                <DrawerTitle className="text-base">Sort your chats</DrawerTitle>
              </DrawerHeader>
              <div
                role="radiogroup"
                aria-label="Sort joined rooms"
                className="mx-auto w-full max-w-lg space-y-1 px-3 pb-2 sm:px-4"
              >
                {SORT_OPTIONS.map((opt) => {
                  const active = opt.value === sort;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => {
                        setSort(opt.value);
                        setSortOpen(false);
                      }}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left text-sm font-medium transition-colors',
                        'focus:outline-none',
                        INSIGHT_FOCUS_RING,
                        active
                          ? 'border-border bg-muted/40 text-foreground'
                          : 'border-border/40 bg-card/40 text-foreground hover:bg-muted/30',
                      )}
                    >
                      <span>{opt.label}</span>
                      {active ? (
                        <Check
                          className="h-4 w-4 shrink-0 text-foreground"
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      ) : null}

      {chip === 'unread' && !isLoading ? (
        <p className="mb-2 text-xs leading-snug text-muted-foreground">
          Unread is based on this device: we mark a chat read when you open it.
          Server read receipts are not wired yet.
        </p>
      ) : null}

      {isLoading ? (
        <div>
          {Array.from({ length: 8 }).map((_, i) => (
            <InboxRowSkeleton key={i} />
          ))}
        </div>
      ) : null}

      {!isLoading && count === 0 && !error ? (
        <div className={cn(INSIGHT_CARD_CLASS, 'px-5 py-10')}>
          {search.trim() && chip === 'all' ? (
            <>
              <h3 className="text-base font-semibold text-foreground">
                No chats match
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a different name, provider, or tag for “{search.trim()}”.
              </p>
            </>
          ) : chip === 'unread' ? (
            <>
              <h3 className="text-base font-semibold text-foreground">
                No unread chats
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                You are caught up on this device, or activity timestamps are not
                available for some rooms yet.
              </p>
            </>
          ) : chip === 'pending' ? (
            <>
              <h3 className="text-base font-semibold text-foreground">
                No pending requests
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                When you request access to a private room, it appears here while
                waiting for approval.
              </p>
            </>
          ) : chip === 'owned' ? (
            <>
              <h3 className="text-base font-semibold text-foreground">
                No owned rooms match
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Rooms you create appear here. Try clearing search or open the
                provider console.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-base font-semibold text-foreground">
                No conversations yet
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Rooms you join or own show up here. Follow the steps below to get
                started.
              </p>
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-foreground">
                <li>
                  <Link
                    to="/dashboard/insight"
                    className={cn(
                      'font-medium underline-offset-2 hover:underline',
                      INSIGHT_FOCUS_RING,
                    )}
                  >
                    Discover public rooms
                  </Link>{' '}
                  and join one that fits your style.
                </li>
                <li>
                  Have an invite or code?{' '}
                  <Link
                    to="/dashboard/pattern-stream/discover/private"
                    className={cn(
                      'font-medium underline-offset-2 hover:underline',
                      INSIGHT_FOCUS_RING,
                    )}
                  >
                    Join a private room
                  </Link>
                  .
                </li>
                <li>
                  Run your own room?{' '}
                  <Link
                    to="/dashboard/pattern-stream/console"
                    className={cn(
                      'font-medium underline-offset-2 hover:underline',
                      INSIGHT_FOCUS_RING,
                    )}
                  >
                    Open provider console
                  </Link>
                  .
                </li>
              </ol>
              <div className="mt-5 flex flex-col gap-2">
                <Link
                  to="/dashboard/pattern-stream/console/create"
                  className={cn(
                    'inline-flex w-full items-center justify-center rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90',
                    INSIGHT_FOCUS_RING,
                  )}
                >
                  Create a new chat
                </Link>
                <Link
                  to="/dashboard/insight"
                  className={cn(
                    'inline-flex w-full items-center justify-center rounded-full border border-border/60 bg-muted/40 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/30',
                    INSIGHT_FOCUS_RING,
                  )}
                >
                  Explore Discover
                </Link>
              </div>
            </>
          )}
        </div>
      ) : null}

      {!isLoading && count > 0 && !error ? (
        <div className="pb-2">
          {filteredRooms.map((room, i) => {
            const preview = previewMap?.get(room.id);
            const last = lastVisitedMap[room.id];
            const unread = isUnreadForStub(room, preview, last);
            return (
              <InsightChatInboxRow
                key={room.id}
                room={room}
                preview={preview}
                currentUserId={user?.id}
                showUnreadDot={unread}
                onOpen={openRoom}
                index={i}
              />
            );
          })}
        </div>
      ) : null}

      {!isLoading && totalLoaded > 0 && count === 0 && chip !== 'all' && !error ? (
        <p className="mt-2 text-center text-sm text-muted-foreground">
          No rooms in this filter{search.trim() ? ' for your search' : ''}. Try
          another chip or tap All.
        </p>
      ) : null}

      {error ? (
        <div className="mt-3 space-y-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-center text-sm text-rose-600 dark:text-rose-400">
          <p>{errMsg}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className={cn(
              'text-sm font-medium underline-offset-2 hover:underline',
              INSIGHT_FOCUS_RING,
            )}
          >
            Retry
          </button>
        </div>
      ) : null}
    </div>
  );
}
