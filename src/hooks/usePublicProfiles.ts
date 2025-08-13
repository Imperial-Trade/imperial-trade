import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const PublicProfileSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string().nullable(),
  avatar_url: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  user_type: z.string().nullable().optional(),
  access_level: z.string().nullable().optional(),
});

type PublicProfile = z.infer<typeof PublicProfileSchema>;

export const usePublicProfiles = (userIds: string[]) => {
  const ids = useMemo(() => {
    const s = new Set(userIds.filter(Boolean));
    return Array.from(s);
  }, [userIds]);

  const query = useQuery({
    queryKey: ["public-profiles", ids.sort().join(",")],
    queryFn: async () => {
      if (!ids.length) return [] as PublicProfile[];
      const { data, error } = await supabase
        .from("public_profiles")
        .select("id, display_name, avatar_url, role, user_type, access_level")
        .in("id", ids);
      if (error) {
        throw new Error(error.message);
      }
      const parsed = z.array(PublicProfileSchema).parse(data ?? []);
      return parsed;
    },
    enabled: ids.length > 0,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    meta: {
      onError: (err: unknown) => {
        logger.warn("usePublicProfiles error:", err);
      },
    },
  });

  const profilesMap = useMemo(() => {
    const map: Record<string, PublicProfile> = {};
    (query.data ?? []).forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [query.data]);

  return {
    profiles: query.data ?? [],
    profilesMap,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
  };
};
