import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, Compass, Loader2 } from 'lucide-react';
import { useRoomList } from '@/hooks/pattern-stream/useRoomList';
import { usePullToRefresh } from '@/hooks/pattern-stream/usePullToRefresh';
import { JoinRoomSheet } from '@/components/pattern-stream/room/JoinRoomSheet';
import type { Room, SortKey } from '@/hooks/pattern-stream/types';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { InsightRoomCard } from '@/insight/InsightRoomCard';
import { queryErrorMessage } from '@/utils/queryErrorMessage';

interface InsightDiscoverRoomsProps {
  search: string;
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'top_performance', label: 'Top performance' },
  { value: 'most_active', label: 'Most active' },
  { value: 'trending', label: 'Trending' },
  { value: 'newest', label: 'Newest' },
];

function InsightRoomCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-muted/60" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted/60" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-muted/40" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-2.5 w-3/4 animate-pulse rounded bg-muted/40" />
            <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted/60" />
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-5 w-20 animate-pulse rounded-full bg-muted/40"
          />
        ))}
      </div>
    </div>
  );
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
          'text-muted-foreground'
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

export function InsightDiscoverRooms({ search }: InsightDiscoverRoomsProps) {
  const [sort, setSort] = useState<SortKey>('top_performance');
  const [sortOpen, setSortOpen] = useState(false);
  const [joinTarget, setJoinTarget] = useState<Room | null>(null);
  /** Insight Discover spans both public and private rooms (search reaches across types). */
  const { data, isLoading, error, refetch } = useRoomList({
    search,
    sort,
  });
  const qc = useQueryClient();

  const sortLabel =
    SORT_OPTIONS.find((o) => o.value === sort)?.label ?? 'Sort';

  const ptr = usePullToRefresh({
    onRefresh: async () => {
      await Promise.all([
        refetch(),
        qc.invalidateQueries({ queryKey: ['pattern-stream'] }),
      ]);
    },
  });

  const count = data?.length ?? 0;

  return (
    <div className="relative px-3 pt-3 sm:px-4">
      <PullToRefreshSpinner
        pulling={ptr.pulling}
        progress={ptr.progress}
        refreshing={ptr.refreshing}
      />

      <div className="mb-3 flex items-center justify-between gap-2">
        <Drawer open={sortOpen} onOpenChange={setSortOpen}>
          <DrawerTrigger asChild>
            <button
              type="button"
              aria-label="Sort rooms"
              className={cn(
                'inline-flex h-8 items-center gap-1 rounded-full px-2 text-sm font-medium text-foreground',
                'hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-0'
              )}
            >
              {sortLabel}
              <ChevronDown
                className="h-4 w-4 opacity-60"
                aria-hidden
              />
            </button>
          </DrawerTrigger>
          <DrawerContent
            className={cn(
              'border-border/60 bg-background backdrop-blur-md',
              'pb-[max(1rem,env(safe-area-inset-bottom))]'
            )}
          >
            <DrawerHeader className="px-4">
              <DrawerTitle className="text-base">Sort rooms</DrawerTitle>
            </DrawerHeader>
            <div
              role="radiogroup"
              aria-label="Sort rooms"
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
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-0',
                      active
                        ? 'border-border bg-muted/40 text-foreground'
                        : 'border-border/40 bg-card/40 text-foreground hover:bg-muted/30'
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
        <span className="truncate text-sm font-medium text-muted-foreground">
          {isLoading
            ? 'Loading rooms...'
            : `${count} room${count === 1 ? '' : 's'}`}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <InsightRoomCardSkeleton key={i} />
          ))}
        </div>
      ) : null}

      {!isLoading && count === 0 && !error ? (
        <div className="rounded-2xl border border-border/60 bg-card/40 px-6 py-12 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-muted/60 text-muted-foreground">
            <Compass className="h-5 w-5" aria-hidden />
          </div>
          <h3 className="mt-3 text-base font-semibold text-foreground">
            {search.trim() ? 'No rooms match' : 'No public rooms yet'}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search.trim()
              ? 'Try a different name, provider, or tag.'
              : 'Be the first to create a public room. Once created, traders worldwide can discover and join it instantly.'}
          </p>
        </div>
      ) : null}

      {!isLoading && count > 0 ? (
        <div className="space-y-3">
          {data!.map((room, i) => (
            <InsightRoomCard
              key={room.id}
              room={room}
              index={i}
              onJoin={(r) => setJoinTarget(r)}
            />
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 space-y-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-center text-sm text-rose-600 dark:text-rose-400">
          <p>
            {queryErrorMessage(
              error,
              'Couldn’t load rooms. Please try again.',
            )}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className={cn(
              'text-sm font-medium underline-offset-2 hover:underline',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-0',
            )}
          >
            Retry
          </button>
        </div>
      ) : null}

      <JoinRoomSheet
        room={joinTarget}
        open={!!joinTarget}
        onClose={() => setJoinTarget(null)}
      />
    </div>
  );
}
