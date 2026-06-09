import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * One row returned by `public.suggest_room_invitees`. The RPC is defined in
 * `supabase/migrations/20260512_room_invite_suggestions.sql`.
 */
export interface InviteSuggestion {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  score: number;
  shared_rooms: number;
  is_provider: boolean;
}

interface UseInviteSuggestionsOptions {
  /** Free-text search; matched against `public_profiles.display_name` (ilike substring). */
  query?: string;
  /** Cap returned rows. Server clamps to 200. */
  limit?: number;
  /** Hide already-selected users on the client without round-tripping. */
  excludeUserIds?: ReadonlySet<string> | readonly string[];
  /** Disable the request (e.g. when the picker is not visible). */
  enabled?: boolean;
}

const DEBOUNCE_MS = 200;

/**
 * Suggestions for the Messenger-style "Add people" picker.
 *
 * - Debounces the user-typed query by 200ms so we don't fire on every keystroke.
 * - Caches per (debouncedQuery, limit) so flipping between "all" and a typed
 *   value snaps back instantly when the user clears the input.
 * - Filters already-selected ids on the client to keep selection sticky even
 *   if the user types something that would have re-included them.
 */
export function useInviteSuggestions({
  query,
  limit = 50,
  excludeUserIds,
  enabled = true,
}: UseInviteSuggestionsOptions = {}) {
  const rawQuery = query?.trim() ?? "";
  const [debouncedQuery, setDebouncedQuery] = useState(rawQuery);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(rawQuery), DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [rawQuery]);

  const result = useQuery({
    enabled,
    queryKey: ["pattern-stream", "invite-suggestions", debouncedQuery, limit],
    queryFn: async () => {
      // Type-cast: this RPC is added in the new migration and isn't yet present
      // in the auto-generated Supabase types. We narrow to InviteSuggestion[].
      const { data, error } = await (supabase as unknown as {
        rpc: (
          name: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: unknown; error: unknown }>;
      }).rpc("suggest_room_invitees", {
        p_query: debouncedQuery.length > 0 ? debouncedQuery : null,
        p_limit: limit,
      });
      if (error) {
        const err = error as { message?: string };
        throw new Error(err?.message ?? "Failed to load suggestions");
      }
      return (data as InviteSuggestion[] | null) ?? [];
    },
    staleTime: 30_000,
  });

  const excludeSet = useMemo(() => {
    if (!excludeUserIds) return null;
    if (excludeUserIds instanceof Set) return excludeUserIds;
    return new Set(excludeUserIds);
  }, [excludeUserIds]);

  const filtered = useMemo<InviteSuggestion[]>(() => {
    const rows = result.data ?? [];
    if (!excludeSet || excludeSet.size === 0) return rows;
    return rows.filter((r) => !excludeSet.has(r.user_id));
  }, [result.data, excludeSet]);

  return {
    suggestions: filtered,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    error: result.error,
    refetch: result.refetch,
    debouncedQuery,
  };
}

/**
 * Imperative wrapper around `invite_room_members`. Returns the number of new
 * pending invitations created. Already-existing memberships are silently
 * skipped server-side.
 */
export async function inviteRoomMembers(
  roomId: string,
  userIds: readonly string[],
): Promise<number> {
  if (!roomId || userIds.length === 0) return 0;
  const { data, error } = await (supabase as unknown as {
    rpc: (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: unknown }>;
  }).rpc("invite_room_members", {
    p_room_id: roomId,
    p_user_ids: userIds,
  });
  if (error) {
    const err = error as { message?: string };
    throw new Error(err?.message ?? "Failed to invite members");
  }
  return typeof data === "number" ? data : 0;
}
