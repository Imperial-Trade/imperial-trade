import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { RoomListItem } from '@/hooks/pattern-stream/useRoomList';
import type {
  Room,
  RoomMemberStatus,
  RoomStats,
  SortKey,
} from '@/hooks/pattern-stream/types';

export interface JoinedRoomListItem extends RoomListItem {
  joinedStatus: RoomMemberStatus | null;
  joinedAt: string | null;
}

export interface UseJoinedRoomListOptions {
  search?: string;
  sort?: SortKey;
}

interface JoinedRow {
  status: RoomMemberStatus;
  joined_at: string;
  rooms: RoomListItem;
}

/**
 * Returns rooms you can open from "My chats": every `room_members` row for the current user,
 * **plus** any `rooms` you own that are missing a membership row (legacy / edge cases), merged
 * and de-duplicated. Each row includes `room_stats` like Discover.
 */
export function useJoinedRoomList(opts: UseJoinedRoomListOptions = {}) {
  const { user } = useAuth();
  const { search, sort = 'top_performance' } = opts;

  return useQuery({
    enabled: !!user,
    queryKey: [
      'pattern-stream',
      'my-rooms',
      user?.id,
      search ?? '',
      sort,
    ],
    queryFn: async (): Promise<JoinedRoomListItem[]> => {
      const { data: members, error } = await supabase
        .from('room_members')
        .select('status, joined_at, rooms(*)')
        .eq('user_id', user!.id);
      if (error) throw error;

      const rows = ((members ?? []) as unknown as JoinedRow[]).filter(
        (r) => !!r.rooms,
      );

      /** Rooms you are a member of (any status Supabase returns for this user). */
      const fromMembers: JoinedRoomListItem[] = rows.map((row) => ({
        ...row.rooms,
        stats: undefined,
        joinedStatus: row.status,
        joinedAt: row.joined_at,
      }));

      /**
       * Rooms you own but are missing from `room_members` (legacy data, failed trigger, or
       * service-created rooms). Ensures "My chats" lists everything you created or joined.
       */
      const { data: ownedRooms, error: ownedErr } = await supabase
        .from('rooms')
        .select('*')
        .eq('owner_id', user!.id);
      if (ownedErr) throw ownedErr;

      const memberIds = new Set(fromMembers.map((r) => r.id));
      const fromOwnerOnly: JoinedRoomListItem[] = ((ownedRooms ?? []) as Room[])
        .filter((room) => !memberIds.has(room.id))
        .map((room) => ({
          ...room,
          stats: undefined,
          joinedStatus: 'active' as RoomMemberStatus,
          joinedAt: room.created_at,
        }));

      const enrichedBase = [...fromMembers, ...fromOwnerOnly];

      const ids = enrichedBase.map((r) => r.id).filter(Boolean);
      let stats: RoomStats[] = [];
      if (ids.length > 0) {
        const { data: statsData } = await supabase
          .from('room_stats' as never)
          .select('*')
          .in('room_id', ids);
        if (statsData) stats = statsData as unknown as RoomStats[];
      }
      const statsMap = new Map<string, RoomStats>();
      stats.forEach((s) => statsMap.set(s.room_id, s));

      const term = search?.trim().toLowerCase() ?? '';
      const enriched: JoinedRoomListItem[] = enrichedBase.map((row) => ({
        ...row,
        stats: statsMap.get(row.id),
      }));

      const filtered = term
        ? enriched.filter((r) => {
            const haystack = [
              r.name ?? '',
              r.description ?? '',
              r.slug ?? '',
            ]
              .join(' ')
              .toLowerCase();
            return haystack.includes(term);
          })
        : enriched;

      switch (sort) {
        case 'most_active':
          filtered.sort(
            (a, b) =>
              (b.stats?.active_members ?? 0) - (a.stats?.active_members ?? 0),
          );
          break;
        case 'trending': {
          const score = (r: JoinedRoomListItem) => {
            const recent = r.stats?.last_signal_at
              ? Math.max(
                  0,
                  1 -
                    (Date.now() -
                      new Date(r.stats.last_signal_at).getTime()) /
                      (1000 * 60 * 60 * 24 * 7),
                )
              : 0;
            return (
              (r.stats?.win_rate ?? 0) * 0.5 +
              (r.stats?.active_members ?? 0) * 0.3 +
              recent * 100 * 0.2
            );
          };
          filtered.sort((a, b) => score(b) - score(a));
          break;
        }
        case 'newest':
          filtered.sort((a, b) => {
            const at = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
            const bt = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;
            return bt - at;
          });
          break;
        case 'top_performance':
        default:
          filtered.sort(
            (a, b) =>
              (b.stats?.win_rate ?? 0) - (a.stats?.win_rate ?? 0) ||
              (b.stats?.pips_gained ?? 0) - (a.stats?.pips_gained ?? 0),
          );
          break;
      }

      return filtered;
    },
    staleTime: 15_000,
  });
}
