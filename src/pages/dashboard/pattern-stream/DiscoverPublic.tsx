import { useOutletContext } from "react-router-dom";
import { useState } from "react";
import { useRoomList } from "@/hooks/pattern-stream/useRoomList";
import { useQueryClient } from "@tanstack/react-query";
import { RoomCard } from "@/components/pattern-stream/room/RoomCard";
import { SortMenu } from "@/components/pattern-stream/discovery/SortMenu";
import { JoinRoomSheet } from "@/components/pattern-stream/room/JoinRoomSheet";
import { PsSkeletonRoomCard } from "@/components/pattern-stream/indicators/PsSkeleton";
import { PullToRefreshIndicator } from "@/components/pattern-stream/indicators/PullToRefreshIndicator";
import { usePullToRefresh } from "@/hooks/pattern-stream/usePullToRefresh";
import type { SortKey, Room } from "@/hooks/pattern-stream/types";
import type { PsLayoutContext } from "./PatternStreamLayout";
import { Compass } from "@phosphor-icons/react";

export default function DiscoverPublic() {
  const { search } = useOutletContext<PsLayoutContext>();
  const [sort, setSort] = useState<SortKey>("top_performance");
  const [joinTarget, setJoinTarget] = useState<Room | null>(null);
  const { data, isLoading, error, refetch } = useRoomList({ type: "public", search, sort });
  const qc = useQueryClient();
  const ptr = usePullToRefresh({
    onRefresh: async () => {
      await Promise.all([refetch(), qc.invalidateQueries({ queryKey: ["pattern-stream"] })]);
    },
  });

  return (
    <div className="px-3 sm:px-4 pt-3 pb-24">
      <PullToRefreshIndicator state={ptr} />
      <div className="flex items-center justify-between mb-3">
        <span style={{ fontSize: 12, color: "var(--ps-text-tertiary)" }}>
          {isLoading ? "Loading rooms..." : `${data?.length ?? 0} public rooms`}
        </span>
        <SortMenu value={sort} onChange={setSort} />
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <PsSkeletonRoomCard key={i} />
          ))}
        </div>
      )}

      {!isLoading && (data?.length ?? 0) === 0 && (
        <EmptyDiscover />
      )}

      {!isLoading && (data?.length ?? 0) > 0 && (
        <div className="ps-room-grid">
          {data!.map((room, i) => (
            <RoomCard
              key={room.id}
              room={room}
              index={i}
              onJoin={(r) => setJoinTarget(r)}
            />
          ))}
        </div>
      )}

      {error && (
        <div
          className="liquid-glass mt-3 p-4 text-center"
          style={{ color: "var(--ps-negative)" }}
        >
          {error.message}
        </div>
      )}

      <JoinRoomSheet room={joinTarget} open={!!joinTarget} onClose={() => setJoinTarget(null)} />
    </div>
  );
}

function EmptyDiscover() {
  return (
    <div className="liquid-glass flex flex-col items-center justify-center text-center py-10 px-6">
      <div
        className="liquid-glass--green flex items-center justify-center mb-3"
        style={{ width: 64, height: 64, borderRadius: 18, background: "var(--ps-glass-bg-elev)" }}
      >
        <Compass size={32} weight="duotone" style={{ color: "var(--ps-green)" }} />
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--ps-text)" }}>
        No public rooms yet
      </h3>
      <p className="mt-1 max-w-xs" style={{ fontSize: 14, color: "var(--ps-text-secondary)" }}>
        Be the first to create a public room. Once created, traders worldwide can discover and join it instantly.
      </p>
    </div>
  );
}
