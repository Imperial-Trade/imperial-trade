import { useOutletContext, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useRoomList } from "@/hooks/pattern-stream/useRoomList";
import { RoomCard } from "@/components/pattern-stream/room/RoomCard";
import { SortMenu } from "@/components/pattern-stream/discovery/SortMenu";
import { JoinRoomSheet } from "@/components/pattern-stream/room/JoinRoomSheet";
import { PsSkeletonRoomCard } from "@/components/pattern-stream/indicators/PsSkeleton";
import type { SortKey, Room } from "@/hooks/pattern-stream/types";
import type { PsLayoutContext } from "./PatternStreamLayout";
import { Lock, KeyReturn } from "@phosphor-icons/react";

export default function DiscoverPrivate() {
  const { search } = useOutletContext<PsLayoutContext>();
  const [sort, setSort] = useState<SortKey>("top_performance");
  const [params] = useSearchParams();
  const codeFromQr = params.get("code") ?? "";
  const [code, setCode] = useState(codeFromQr);
  const [joinTarget, setJoinTarget] = useState<Room | null>(null);

  useEffect(() => {
    if (codeFromQr) setCode(codeFromQr);
  }, [codeFromQr]);

  // Combined search: name + code
  const composed = code ? `${search} ${code}`.trim() : search;
  const { data, isLoading, error } = useRoomList({ type: "private", search: composed, sort });

  return (
    <div className="px-3 sm:px-4 pt-3 pb-24">
      {/* Code entry pill */}
      <div className="liquid-glass flex items-center gap-2 px-3 mb-3" style={{ height: 44, borderRadius: 9999 }}>
        <KeyReturn size={16} style={{ color: "var(--ps-text-tertiary)" }} />
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter 4-digit room code"
          className="flex-1 bg-transparent outline-none border-none ps-numeric"
          style={{ color: "var(--ps-text)", fontSize: 14, letterSpacing: 1 }}
          inputMode="numeric"
          maxLength={12}
          aria-label="Private room code"
        />
        {code && (
          <button onClick={() => setCode("")} className="ps-btn-ghost px-2" style={{ fontSize: 12 }}>
            Clear
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <span style={{ fontSize: 12, color: "var(--ps-text-tertiary)" }}>
          {isLoading ? "Loading..." : `${data?.length ?? 0} private rooms`}
        </span>
        <SortMenu value={sort} onChange={setSort} />
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <PsSkeletonRoomCard key={i} />
          ))}
        </div>
      )}

      {!isLoading && (data?.length ?? 0) === 0 && (
        <EmptyPrivate />
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
        <div className="liquid-glass mt-3 p-4 text-center" style={{ color: "var(--ps-negative)" }}>
          {error.message}
        </div>
      )}

      <JoinRoomSheet room={joinTarget} open={!!joinTarget} onClose={() => setJoinTarget(null)} />
    </div>
  );
}

function EmptyPrivate() {
  return (
    <div className="liquid-glass flex flex-col items-center justify-center text-center py-10 px-6">
      <div
        className="liquid-glass--green flex items-center justify-center mb-3"
        style={{ width: 64, height: 64, borderRadius: 18, background: "var(--ps-glass-bg-elev)" }}
      >
        <Lock size={32} weight="duotone" style={{ color: "var(--ps-green)" }} />
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--ps-text)" }}>
        No private rooms match
      </h3>
      <p className="mt-1 max-w-xs" style={{ fontSize: 14, color: "var(--ps-text-secondary)" }}>
        Type a room name, paste a code, or scan a QR to find a private room. You can request to join after the room appears.
      </p>
    </div>
  );
}
