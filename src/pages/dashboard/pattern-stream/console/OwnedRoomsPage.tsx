import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { RoomCard } from "@/components/pattern-stream/room/RoomCard";
import { PsSkeletonRoomCard } from "@/components/pattern-stream/indicators/PsSkeleton";
import type { RoomListItem } from "@/hooks/pattern-stream/useRoomList";
import type { RoomStats } from "@/hooks/pattern-stream/types";
import { Plus } from "@phosphor-icons/react";

export default function OwnedRoomsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["pattern-stream", "owned-rooms", user?.id],
    queryFn: async () => {
      const { data: rooms, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = (rooms ?? []).map((r) => r.id);
      let stats: RoomStats[] = [];
      if (ids.length > 0) {
        const { data: statsData } = await supabase
          .from("room_stats" as never)
          .select("*")
          .in("room_id", ids);
        if (statsData) stats = statsData as unknown as RoomStats[];
      }
      const map = new Map<string, RoomStats>();
      stats.forEach((s) => map.set(s.room_id, s));
      return (rooms ?? []).map((r) => ({ ...r, stats: map.get(r.id) }) as RoomListItem);
    },
  });

  return (
    <div className="px-3 sm:px-4 pt-3 pb-24">
      <div className="flex items-center justify-between mb-3">
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--ps-text)" }}>
          Provider console
        </h2>
        <button
          onClick={() => navigate("/dashboard/pattern-stream/console/create")}
          className="ps-btn ps-btn-primary"
        >
          <Plus size={18} weight="bold" />
          <span className="hidden sm:inline">New room</span>
        </button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <PsSkeletonRoomCard key={i} />
          ))}
        </div>
      )}

      {!isLoading && (data?.length ?? 0) === 0 && (
        <div className="liquid-glass p-8 text-center">
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--ps-text)" }}>
            No rooms owned yet
          </h3>
          <p className="mt-1" style={{ fontSize: 14, color: "var(--ps-text-secondary)" }}>
            Create your first room to start posting signals and growing a community.
          </p>
          <button
            onClick={() => navigate("/dashboard/pattern-stream/console/create")}
            className="ps-btn ps-btn-primary mt-4 mx-auto"
          >
            <Plus size={18} weight="bold" />
            Create room
          </button>
        </div>
      )}

      {!isLoading && (data?.length ?? 0) > 0 && (
        <div className="ps-room-grid">
          {data!.map((room, i) => (
            <RoomCard key={room.id} room={room} index={i} joinedStatus="active" />
          ))}
        </div>
      )}
    </div>
  );
}
