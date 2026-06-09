import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RoomCard } from "@/components/pattern-stream/room/RoomCard";
import { PsSkeletonRoomCard } from "@/components/pattern-stream/indicators/PsSkeleton";
import type { RoomListItem } from "@/hooks/pattern-stream/useRoomList";
import type { RoomStats } from "@/hooks/pattern-stream/types";
import { House } from "@phosphor-icons/react";

interface MyRoomRow {
  status: string;
  rooms: RoomListItem;
}

export default function MyRooms() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["pattern-stream", "my-rooms", user?.id],
    queryFn: async () => {
      const { data: members, error } = await supabase
        .from("room_members")
        .select("status, rooms(*)")
        .eq("user_id", user!.id);
      if (error) throw error;
      const rows = (members ?? []) as unknown as MyRoomRow[];

      const ids = rows.map((m) => m.rooms.id).filter(Boolean);
      let stats: RoomStats[] = [];
      if (ids.length > 0) {
        const { data: statsData } = await supabase
          .from("room_stats" as never)
          .select("*")
          .in("room_id", ids);
        if (statsData) stats = statsData as unknown as RoomStats[];
      }
      const statsMap = new Map<string, RoomStats>();
      stats.forEach((s) => statsMap.set(s.room_id, s));

      return rows.map((m) => ({
        status: m.status as "active" | "pending",
        room: { ...m.rooms, stats: statsMap.get(m.rooms.id) } as RoomListItem,
      }));
    },
    staleTime: 15_000,
  });

  return (
    <div className="px-3 sm:px-4 pt-3 pb-24">
      <h2 className="mb-3" style={{ fontSize: 20, fontWeight: 600, color: "var(--ps-text)" }}>
        My rooms
      </h2>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <PsSkeletonRoomCard key={i} />
          ))}
        </div>
      )}

      {!isLoading && (data?.length ?? 0) === 0 && (
        <div className="liquid-glass flex flex-col items-center justify-center text-center py-10 px-6">
          <div
            className="liquid-glass--green flex items-center justify-center mb-3"
            style={{ width: 64, height: 64, borderRadius: 18, background: "var(--ps-glass-bg-elev)" }}
          >
            <House size={32} weight="duotone" style={{ color: "var(--ps-green)" }} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--ps-text)" }}>
            No rooms joined yet
          </h3>
          <p className="mt-1 max-w-xs" style={{ fontSize: 14, color: "var(--ps-text-secondary)" }}>
            Discover public rooms or use a code to join private ones. Joined rooms will appear here for quick access.
          </p>
        </div>
      )}

      {!isLoading && (data?.length ?? 0) > 0 && (
        <div className="ps-room-grid">
          {data!.map((entry, i) => (
            <RoomCard
              key={entry.room.id}
              room={entry.room}
              index={i}
              joinedStatus={entry.status as "active" | "pending"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
