import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Post } from '@/insight/insightPost';
import { fetchInsightSearchPostPool } from '@/insight/fetchInsightSearchPostPool';
import {
  getCanonicalAssetListLabel,
  getCombinedSymbolFrequency,
  isFinancialAsset,
  isValidSymbol,
} from '@/insight/symbolMapper';
import {
  appendCreateHashtagCandidate,
  browseSymbolCatalogAlphabetical,
  collectTagAndSymbolCounts,
  compareRanked,
  dedupeAssetSuggestionsByCanonicalSymbol,
  mergeAssetFeedAndCatalog,
  parseSearchQuery,
  rankAssetSuggestionsFromCounts,
  rankHashtagSuggestionsFromCounts,
  rankPostsByTextMatch,
  sanitizeIlikeNeedle,
  scoreSearchMatch,
  searchSymbolCatalogForComposer,
  topHashtagsByFrequency,
  topSymbolsByFrequency,
  type RankedPostHit,
} from '@/insight/orderflowSearchRank';
import {
  readRecentComposerAssets,
  readRecentComposerHashtags,
} from '@/insight/composerRecentTags';

export const ORDERFLOW_FEED_CATEGORIES = [
  { value: 'discussion', label: 'General Discussion' },
  { value: 'question', label: 'Questions' },
  { value: 'analysis', label: 'Technical Analysis' },
  { value: 'news', label: 'Market News' },
  { value: 'strategy', label: 'Trading Strategy' },
] as const;

/** Meta-style scope tabs (feed search strip + `OrderflowSearchPanel`). */
export const ORDERFLOW_SEARCH_SCOPE_OPTIONS = [
  { id: 'all' as const, label: 'All' },
  { id: 'profiles' as const, label: 'People' },
  { id: 'posts' as const, label: 'Posts' },
  { id: 'assets' as const, label: 'Symbols' },
  { id: 'hashtags' as const, label: 'Hashtags' },
] as const;

export type OrderflowSearchScope =
  (typeof ORDERFLOW_SEARCH_SCOPE_OPTIONS)[number]['id'];

/** Options for `useOrderflowSearchSuggestions`. */
export type UseOrderflowSearchSuggestionsOptions = {
  /**
   * When true (e.g. full-page feed search), use wider hashtag caps and merge recent tags
   * into suggestions — only applies while scope is `all` / `hashtags` / `assets` (see `wantHashtags` / `wantAssets`).
   */
  tagSymbolTypeaheadAlways?: boolean;
};

export type ProfileSuggestion = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  trader_level?: string | null;
  community_tier?: number | null;
  real_name?: string | null;
  location?: string | null;
  /** Present when the viewer is logged in; derived from `user_follows`. */
  isFollowing?: boolean;
};

export type TagSymbolSuggestion = {
  label: string;
  score: number;
  frequency: number;
};

export type CategorySuggestion = {
  value: string;
  label: string;
  score: number;
};

export type ReplySearchHit = {
  id: string;
  post_id: string;
  content: string;
  score: number;
  /** From feed cache when available. */
  postTitle: string | null;
};

const MAX_POSTS_SCAN = 500;
/** Typeahead rows per section (was 3; raised for Meta-style lists). */
export const ORDERFLOW_TYPEAHEAD_TOP_N = 10;
const TOP_N = ORDERFLOW_TYPEAHEAD_TOP_N;
/** Match composer picker: long lists for `#…` / `$…` prefix search. */
const TAG_ASSET_PREFIX_LIMIT = 48;
const CATALOG_SYMBOL_PREFETCH_PREFIX = TAG_ASSET_PREFIX_LIMIT * 2;
const PROFILE_FETCH = 20;
const REPLY_FETCH = 48;
/** Same source as home feed: one list per Following / Explore tab. */
export function getCachedPostsForFeedMode(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string | undefined,
  feedViewMode: 'following' | 'explore'
): Post[] {
  return (
    queryClient.getQueryData<Post[]>([
      'optimized-posts',
      userId,
      feedViewMode,
    ]) ?? []
  );
}

export function useInsightSearchSuggestions(
  searchInput: string,
  userId: string | undefined,
  scope: OrderflowSearchScope = 'all',
  feedViewMode: 'following' | 'explore' = 'explore',
  options?: UseOrderflowSearchSuggestionsOptions
) {
  const trimmedLive = searchInput.trim();
  const queryClient = useQueryClient();
  const enabled = trimmedLive.length > 0;
  const tagSymbolTypeaheadAlways = options?.tagSymbolTypeaheadAlways === true;

  const query = useQuery({
    queryKey: [
      'orderflow-search',
      userId ?? 'anon',
      trimmedLive,
      scope,
      feedViewMode,
      tagSymbolTypeaheadAlways,
    ],
    enabled,
    staleTime: 30_000,
    /** Keep last results visible while the next query runs (snappier typing). */
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const parsed = parseSearchQuery(trimmedLive);
      const { intent, needleLower } = parsed;

      const wantProfiles = scope === 'all' || scope === 'profiles';
      const wantPosts = scope === 'all' || scope === 'posts';
      /** Strict tabs: do not load symbols/hashtags on People or Posts (was broken by `tagSymbolTypeaheadAlways`). */
      const wantAssets = scope === 'all' || scope === 'assets';
      const wantHashtags = scope === 'all' || scope === 'hashtags';
      const wantCategories = scope === 'all';

      const runProfiles =
        wantProfiles &&
        needleLower.length > 0 &&
        (scope === 'profiles' || (scope === 'all' && intent === 'general'));

      const runPostReplyHits =
        wantPosts &&
        intent !== 'asset' &&
        needleLower.length > 0 &&
        (scope === 'posts' ||
          (scope === 'all' && (intent === 'general' || intent === 'hashtag')));

      const runHashtagsBucket =
        wantHashtags &&
        intent !== 'asset' &&
        (intent === 'hashtag' || intent === 'general');

      const runAssetsBucket =
        wantAssets &&
        intent !== 'hashtag' &&
        (intent === 'asset' || intent === 'general');

      let merged = getCachedPostsForFeedMode(
        queryClient,
        userId,
        feedViewMode
      );
      if (merged.length === 0) {
        merged = await fetchInsightSearchPostPool(userId, feedViewMode);
      }

      const safe = sanitizeIlikeNeedle(needleLower);

      /** Start profile I/O immediately (do not block on tag/symbol scans). */
      const [followsRes, profileBaseRes] = await Promise.all([
        userId && runProfiles
          ? supabase
              .from('user_follows')
              .select('following_id')
              .eq('follower_id', userId)
          : Promise.resolve({ data: null as { following_id: string }[] | null }),
        runProfiles && safe.length > 0
          ? supabase
              .from('public_profiles')
              .select(
                'id, display_name, avatar_url, trader_level, community_tier'
              )
              .ilike('display_name', `%${safe}%`)
              .limit(PROFILE_FETCH)
          : Promise.resolve({
              data: null as Record<string, unknown>[] | null,
              error: null as null,
            }),
      ]);

      const followingIds = new Set<string>(
        (followsRes.data ?? []).map((r) => r.following_id)
      );

      let tagCounts = new Map<string, number>();
      let symbolCounts = new Map<string, number>();
      if (runHashtagsBucket || runAssetsBucket) {
        const collected = collectTagAndSymbolCounts(merged, MAX_POSTS_SCAN);
        tagCounts = collected.tagCounts;
        symbolCounts = collected.symbolCounts;
      }

      let profiles: ProfileSuggestion[] = [];
      if (runProfiles && safe.length > 0) {
        const { data, error } = profileBaseRes;

        type ProfileExtras = {
          real_name: string | null;
          location: string | null;
        };
        const extrasById = new Map<string, ProfileExtras>();

        if (!error && data?.length) {
          const ids = data.map((r) => r.id as string);
          const merge = (id: string, patch: Partial<ProfileExtras>) => {
            const cur = extrasById.get(id) ?? {
              real_name: null,
              location: null,
            };
            extrasById.set(id, { ...cur, ...patch });
          };

          const [extrasRes, fromProfilesRes] = await Promise.all([
            supabase
              .from('public_profiles')
              .select('id, real_name, location')
              .in('id', ids),
            supabase.from('profiles').select('id, location').in('id', ids),
          ]);

          if (!extrasRes.error && extrasRes.data) {
            for (const row of extrasRes.data) {
              const r = row as {
                id: string;
                real_name?: string | null;
                location?: string | null;
              };
              merge(r.id, {
                real_name: r.real_name ?? null,
                location: r.location?.trim() ? r.location.trim() : null,
              });
            }
          }

          if (!fromProfilesRes.error && fromProfilesRes.data) {
            for (const row of fromProfilesRes.data) {
              const r = row as { id: string; location?: string | null };
              const v = r.location?.trim() ?? null;
              if (v) merge(r.id, { location: v });
            }
          }
        }

        if (!error && data) {
          const scored = data
            .filter((r) => r.display_name?.trim())
            .map((r) => {
              const nameL = String(r.display_name).toLowerCase();
              const sc = scoreSearchMatch(needleLower, nameL);
              return {
                row: r as ProfileSuggestion,
                score: sc,
                label: String(r.display_name),
              };
            })
            .filter((x) => x.score > 0);

          const followed = scored
            .filter((x) => followingIds.has(x.row.id))
            .sort((a, b) =>
              compareRanked(
                { score: a.score, label: a.label, frequency: 0 },
                { score: b.score, label: b.label, frequency: 0 }
              )
            );
          const rest = scored
            .filter((x) => !followingIds.has(x.row.id))
            .sort((a, b) =>
              compareRanked(
                { score: a.score, label: a.label, frequency: 0 },
                { score: b.score, label: b.label, frequency: 0 }
              )
            );
          profiles = [...followed, ...rest].slice(0, TOP_N).map((x) => {
            const ex = extrasById.get(x.row.id);
            return {
              ...x.row,
              real_name: ex?.real_name ?? null,
              location: ex?.location ?? null,
              isFollowing: followingIds.has(x.row.id),
            };
          });
        }
      }

      let postHits: RankedPostHit[] = [];
      let replyHits: ReplySearchHit[] = [];
      if (runPostReplyHits) {
        postHits = rankPostsByTextMatch(
          merged,
          needleLower,
          MAX_POSTS_SCAN,
          TOP_N,
          userId
        );

        const safe = sanitizeIlikeNeedle(needleLower);
        if (safe.length > 0) {
          const { data: replyRows, error: repliesErr } = await supabase
            .from('replies')
            .select('id, post_id, content')
            .is('deleted_at', null)
            .ilike('content', `%${safe}%`)
            .order('created_at', { ascending: false })
            .limit(REPLY_FETCH);

          if (!repliesErr && replyRows?.length) {
            const postById = new Map(merged.map((p) => [p.id, p]));
            const replyBoost = (postId: string): number => {
              const p = postById.get(postId);
              if (!p) return 0;
              if (userId && p.author?.id === userId) return 3;
              if (p.isFollowing) return 2;
              return 0;
            };
            const ranked = replyRows
              .map((row) => {
                const c = String(row.content ?? '').toLowerCase();
                const sc = scoreSearchMatch(needleLower, c);
                const pid = row.post_id as string;
                return {
                  id: row.id as string,
                  post_id: pid,
                  content: String(row.content ?? ''),
                  score: sc,
                  postTitle: postById.get(pid)?.title ?? null,
                };
              })
              .filter((x) => x.score > 0)
              .sort((a, b) => {
                const ba = replyBoost(a.post_id);
                const bb = replyBoost(b.post_id);
                if (bb !== ba) return bb - ba;
                return compareRanked(
                  {
                    score: a.score,
                    label: a.content.slice(0, 40),
                    frequency: 0,
                  },
                  {
                    score: b.score,
                    label: b.content.slice(0, 40),
                    frequency: 0,
                  }
                );
              })
              .slice(0, TOP_N);
            replyHits = ranked;
          }
        }
      }

      let hashtagRows: TagSymbolSuggestion[] = [];
      if (runHashtagsBucket) {
        if (intent === 'hashtag') {
          if (!needleLower) {
            const recentRaw = readRecentComposerHashtags();
            const recentTags = recentRaw
              .map((t) => t.trim().toLowerCase())
              .filter((t) => /^[a-z0-9_-]+$/.test(t))
              .filter((t) => !isFinancialAsset(`#${t}`));
            const trending = topHashtagsByFrequency(
              tagCounts,
              TAG_ASSET_PREFIX_LIMIT
            ).filter((t) => !recentTags.includes(t.label.toLowerCase()));
            const recentRows: TagSymbolSuggestion[] = recentTags.map(
              (label) => ({
                label,
                score: 0,
                frequency: tagCounts.get(label) ?? 0,
              })
            );
            hashtagRows = [...recentRows, ...trending].slice(
              0,
              TAG_ASSET_PREFIX_LIMIT
            );
          } else {
            const ranked = rankHashtagSuggestionsFromCounts(
              tagCounts,
              needleLower,
              intent,
              TAG_ASSET_PREFIX_LIMIT
            );
            hashtagRows = appendCreateHashtagCandidate(
              needleLower,
              ranked,
              TAG_ASSET_PREFIX_LIMIT
            );
          }
        } else {
          const cap = tagSymbolTypeaheadAlways
            ? TAG_ASSET_PREFIX_LIMIT
            : TOP_N;
          let ranked = rankHashtagSuggestionsFromCounts(
            tagCounts,
            needleLower,
            intent,
            cap
          );
          if (tagSymbolTypeaheadAlways && needleLower) {
            const seen = new Set(
              ranked.map((t) => t.label.toLowerCase())
            );
            for (const label of readRecentComposerHashtags()
              .map((t) => t.trim().toLowerCase())
              .filter(
                (t) =>
                  /^[a-z0-9_-]+$/.test(t) &&
                  !isFinancialAsset(`#${t}`) &&
                  t.includes(needleLower) &&
                  !seen.has(t)
              )) {
              seen.add(label);
              ranked.push({
                label,
                score: scoreSearchMatch(needleLower, label),
                frequency: tagCounts.get(label) ?? 0,
              });
            }
            ranked.sort((a, b) =>
              compareRanked(
                { score: a.score, label: a.label, frequency: a.frequency },
                { score: b.score, label: b.label, frequency: b.frequency }
              )
            );
            ranked = ranked.slice(0, TAG_ASSET_PREFIX_LIMIT);
            hashtagRows = appendCreateHashtagCandidate(
              needleLower,
              ranked,
              TAG_ASSET_PREFIX_LIMIT
            );
          } else {
            hashtagRows = ranked;
          }
        }
      }

      let assetRows: TagSymbolSuggestion[] = [];
      if (runAssetsBucket) {
        if (intent === 'asset' && !needleLower) {
          const recentSyms = readRecentComposerAssets().filter(isValidSymbol);
          const recentCanon = new Set(
            recentSyms.map((s) => getCanonicalAssetListLabel(s))
          );
          const trending = topSymbolsByFrequency(
            symbolCounts,
            TAG_ASSET_PREFIX_LIMIT * 2,
            isValidSymbol
          ).filter(
            (t) =>
              !recentCanon.has(getCanonicalAssetListLabel(t.label))
          );
          const recentRows: TagSymbolSuggestion[] = recentSyms.map((label) => ({
            label,
            score: 0,
            frequency: symbolCounts.get(label.toUpperCase()) ?? 0,
          }));
          let combined = dedupeAssetSuggestionsByCanonicalSymbol([
            ...recentRows,
            ...trending,
          ]);
          if (combined.length < TAG_ASSET_PREFIX_LIMIT) {
            const seen = new Set(
              combined.map((r) =>
                getCanonicalAssetListLabel(r.label.toUpperCase())
              )
            );
            const fill = browseSymbolCatalogAlphabetical(
              TAG_ASSET_PREFIX_LIMIT - combined.length,
              seen
            );
            combined = dedupeAssetSuggestionsByCanonicalSymbol([
              ...combined,
              ...fill,
            ]);
          }
          assetRows = combined
            .map((r) => ({
              ...r,
              frequency: getCombinedSymbolFrequency(
                symbolCounts,
                r.label.toUpperCase()
              ),
            }))
            .slice(0, TAG_ASSET_PREFIX_LIMIT);
        } else {
          const feedRanked = rankAssetSuggestionsFromCounts(
            symbolCounts,
            needleLower,
            intent,
            TAG_ASSET_PREFIX_LIMIT,
            isValidSymbol
          );
          const catalogRanked = searchSymbolCatalogForComposer(
            needleLower,
            CATALOG_SYMBOL_PREFETCH_PREFIX
          );
          assetRows = mergeAssetFeedAndCatalog(
            feedRanked,
            catalogRanked,
            TAG_ASSET_PREFIX_LIMIT
          );
        }
      }

      let categories: CategorySuggestion[] = [];
      if (wantCategories && intent === 'general' && needleLower.length > 0) {
        for (const c of ORDERFLOW_FEED_CATEGORIES) {
          const sc = Math.max(
            scoreSearchMatch(needleLower, c.label.toLowerCase()),
            scoreSearchMatch(needleLower, c.value.toLowerCase())
          );
          if (sc > 0) {
            categories.push({
              value: c.value,
              label: c.label,
              score: sc,
            });
          }
        }
        categories.sort((a, b) =>
          compareRanked(
            { score: a.score, label: a.label, frequency: 0 },
            { score: b.score, label: b.label, frequency: 0 }
          )
        );
        categories = categories.slice(0, TOP_N);
      }

      return {
        parsed,
        profiles,
        postHits,
        replyHits,
        hashtags: hashtagRows,
        assets: assetRows,
        categories,
      };
    },
  });

  return {
    debouncedQuery: trimmedLive,
    parsed: query.data?.parsed ?? parseSearchQuery(trimmedLive),
    profiles: query.data?.profiles ?? [],
    postHits: query.data?.postHits ?? [],
    replyHits: query.data?.replyHits ?? [],
    hashtags: query.data?.hashtags ?? [],
    assets: query.data?.assets ?? [],
    categories: query.data?.categories ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
  };
}
