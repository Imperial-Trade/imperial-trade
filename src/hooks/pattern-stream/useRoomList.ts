import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Room, RoomStats, SortKey } from "./types";

export interface RoomListItem extends Room {
  stats?: RoomStats;
}

export interface UseRoomListOptions {
  type?: "public" | "private";
  search?: string;
  sort?: SortKey;
  monetization?: "free" | "paid" | "all";
}

const DEFAULT_SORT: SortKey = "top_performance";

export function useRoomList(opts: UseRoomListOptions = {}) {
  const { type, search, sort = DEFAULT_SORT, monetization = "all" } = opts;

  return useQuery({
    queryKey: ["pattern-stream", "rooms", type ?? "all", search ?? "", sort, monetization],
    queryFn: async (): Promise<RoomListItem[]> => {
      let query = supabase
        .from("rooms")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (type) query = query.eq("type", type);
      if (monetization !== "all") query = query.eq("monetization", monetization);

      if (search && search.trim().length > 0) {
        const term = `%${search.trim()}%`;
        query = query.or(`name.ilike.${term},description.ilike.${term},slug.ilike.${term}`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const ids = (data ?? []).map((r) => r.id);
      let stats: RoomStats[] = [];
      if (ids.length > 0) {
        const { data: statsData, error: statsError } = await supabase
          .from("room_stats" as never)
          .select("*")
          .in("room_id", ids);
        if (!statsError && statsData) stats = statsData as unknown as RoomStats[];
      }

      const statsMap = new Map<string, RoomStats>();
      stats.forEach((s) => statsMap.set(s.room_id, s));

      const enriched: RoomListItem[] = (data ?? []).map((r) => ({
        ...r,
        stats: statsMap.get(r.id),
      }));

      switch (sort) {
        case "top_performance":
          enriched.sort(
            (a, b) =>
              (b.stats?.win_rate ?? 0) - (a.stats?.win_rate ?? 0) ||
              (b.stats?.pips_gained ?? 0) - (a.stats?.pips_gained ?? 0),
          );
          break;
        case "most_active":
          enriched.sort(
            (a, b) =>
              (b.stats?.active_members ?? 0) - (a.stats?.active_members ?? 0),
          );
          break;
        case "trending": {
          const score = (r: RoomListItem) => {
            const recent = r.stats?.last_signal_at
              ? Math.max(0, 1 - (Date.now() - new Date(r.stats.last_signal_at).getTime()) / (1000 * 60 * 60 * 24 * 7))
              : 0;
            return (r.stats?.win_rate ?? 0) * 0.5 + (r.stats?.active_members ?? 0) * 0.3 + recent * 100 * 0.2;
          };
          enriched.sort((a, b) => score(b) - score(a));
          break;
        }
        case "newest":
        default:
          enriched.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          );
          break;
      }

      return enriched;
    },
    staleTime: 30_000,
  });
}
