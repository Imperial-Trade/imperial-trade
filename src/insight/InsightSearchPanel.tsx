import React, { useMemo, useState } from 'react';
import { useScrollPagedList } from '@/insight/useScrollPagedList';
import { InsightPagedList } from '@/insight/InsightPagedList';
import {
  Clock,
  Hash,
  Loader2,
  MessageSquare,
  Search,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AuthorAtLevelPill } from '@/insight/AuthorAtLevelPill';
import { EnhancedAvatar } from '@/insight/enhanced-avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useIsDesktop } from '@/hooks/use-mobile';
import {
  ORDERFLOW_FEED_CATEGORIES,
  ORDERFLOW_SEARCH_SCOPE_OPTIONS,
  useInsightSearchSuggestions,
  type OrderflowSearchScope,
  type TagSymbolSuggestion,
} from '@/insight/useInsightSearchSuggestions';
import { cn } from '@/lib/utils';
import {
  orderflowGlassBackdropClassName,
  ORDERFLOW_FEED_STRIP_HEIGHT_CSS_VAR,
} from '@/insight/orderflowChrome';
import { getSymbolInfo } from '@/insight/symbolMapper';
import {
  readRecentComposerAssets,
  readRecentComposerHashtags,
} from '@/insight/composerRecentTags';
import { parseSearchQuery } from '@/insight/orderflowSearchRank';
import type { Post } from '@/insight/insightPost';
import { PostListSkeleton } from '@/insight/PostSkeleton';
import {
  clearSearchHistory,
  pushSearchHistory,
  readSearchHistory,
  removeSearchHistoryItem,
  searchHistoryIdForHashtag,
  searchHistoryIdForProfile,
  searchHistoryIdForQuery,
  searchHistoryIdForSymbol,
  type SearchHistoryItem,
} from '@/utils/orderflowSearchHistory';
import {
  openInsightCommunityComments,
  openInsightCommunityProfile,
  openInsightCommunityTagOrSymbol,
} from '@/insight/insightCommunityLinks';

function profileInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return displayName.trim().slice(0, 2).toUpperCase() || '?';
}

function clipText(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** Compact counts for suggestion rows (e.g. 1.2k, 3.4M). */
function formatCompactPostCount(n: number): string {
  const v = Math.max(0, Math.floor(n));
  if (v < 1000) return String(v);
  try {
    return new Intl.NumberFormat(undefined, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(v);
  } catch {
    if (v < 1_000_000)
      return `${Math.round(v / 100) / 10}`.replace(/\.0$/, '') + 'k';
    return `${Math.round(v / 100_000) / 10}`.replace(/\.0$/, '') + 'M';
  }
}

/** Leading circle for hashtag rows (Recent + suggestions): blue `#` glyph, not initials. */
function HashtagLeadingCircle() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted ring-1 ring-border/60 sm:h-10 sm:w-10">
      <Hash
        className="h-5 w-5 shrink-0 text-primary sm:h-[1.35rem] sm:w-[1.35rem]"
        strokeWidth={2.25}
        aria-hidden
      />
    </div>
  );
}

/** Avoid `bg-accent`: in dark theme `--accent` matches primary cyan and reads as loud search highlight. */
const rowBtn =
  'w-full text-left px-3 py-2.5 sm:py-2 min-h-11 sm:min-h-0 text-sm text-foreground rounded-md transition-colors flex items-center gap-2 min-w-0 touch-manipulation [-webkit-tap-highlight-color:transparent] hover:bg-muted/25 hover:text-foreground active:bg-muted/30';

/** Meta-style scope pills (matches feed `/?search=1` strip tabs). */
const scopeChipBase =
  'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors';

/** Empty state for search results (matches Posts & replies pattern). */
const searchNoResultsClassName =
  'rounded-lg border border-border/50 bg-card/40 px-4 py-8 text-center text-sm text-muted-foreground';

/** Section titles when `$…` matches composer `AssetRows`. */
const assetPickerSectionTitleClass =
  'text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-2';

type AssetRowTagged = TagSymbolSuggestion & { isRecent: boolean };

/** Same row chrome as `ComposerTagPicker` `AssetRows` (initials circle, $SYM, display name, Recent / count). */
function OrderflowAssetPickerRow({
  a,
  isRecent,
  onPick,
}: {
  a: TagSymbolSuggestion;
  isRecent: boolean;
  onPick: () => void;
}) {
  const displayName = getSymbolInfo(a.label).displayName;
  return (
    <button
      type="button"
      className={cn(
        'w-full text-left rounded-lg transition-colors flex items-center min-w-0 px-3 py-2.5 justify-between gap-3 text-foreground touch-manipulation [-webkit-tap-highlight-color:transparent] hover:bg-accent active:bg-muted/30'
      )}
      onClick={onPick}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold uppercase text-foreground ring-1 ring-border/60">
          {a.label.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="text-sm font-bold leading-tight">${a.label}</div>
          <div className="truncate text-sm text-muted-foreground">
            {displayName}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
        {isRecent ? (
          <span className="text-[10px] font-medium uppercase text-muted-foreground">
            Recent
          </span>
        ) : null}
        {a.frequency > 0 || isRecent ? (
          <span className="tabular-nums text-xs text-muted-foreground">
            {a.frequency === 0
              ? '0 posts'
              : `${formatCompactPostCount(a.frequency)} ${a.frequency === 1 ? 'post' : 'posts'}`}
          </span>
        ) : null}
      </div>
    </button>
  );
}

function assetBucketForPicker(
  label: string
): 'crypto' | 'equities' | 'forex' | 'commodity' {
  const t = getSymbolInfo(label).type;
  if (t === 'crypto') return 'crypto';
  if (t === 'forex') return 'forex';
  if (t === 'commodity') return 'commodity';
  return 'equities';
}

function groupSearchAssetsLikeComposer(
  rows: AssetRowTagged[],
  queryEmpty: boolean
) {
  const recent = rows.filter((r) => r.isRecent);
  const rest = queryEmpty ? rows.filter((r) => !r.isRecent) : rows;
  const equities: AssetRowTagged[] = [];
  const crypto: AssetRowTagged[] = [];
  const forex: AssetRowTagged[] = [];
  const commodity: AssetRowTagged[] = [];
  for (const r of rest) {
    const b = assetBucketForPicker(r.label);
    if (b === 'crypto') crypto.push(r);
    else if (b === 'forex') forex.push(r);
    else if (b === 'commodity') commodity.push(r);
    else equities.push(r);
  }
  return { recent, equities, crypto, forex, commodity };
}

export type OrderflowSearchPanelExternalState = {
  query: string;
  onQueryChange: (q: string) => void;
  scope: OrderflowSearchScope;
  onScopeChange: (s: OrderflowSearchScope) => void;
  selectedCategory: string;
  onSelectedCategoryChange: (c: string) => void;
};

export type OrderflowSearchPanelProps = {
  /**
   * Called after programmatic navigation to a result (e.g. legacy `SearchModal` should close).
   * Do not pass `navigate(-1)` here — it will undo the navigation.
   */
  onDismiss?: () => void;
  applyFeedSearch?: (
    query: string,
    category: string,
    scope?: OrderflowSearchScope
  ) => void;
  feedViewMode?: 'following' | 'explore';
  /**
   * Compact mobile: chips + field stay fixed in the column; only results/idle lists
   * scroll (avoids document scroll breaking sticky/fixed chrome).
   */
  mobileScrollListsOnly?: boolean;
  /** Passed when `mobileScrollListsOnly` — visual viewport keyboard inset (px). */
  keyboardInsetPx?: number;
  /** When `mobileScrollListsOnly`: extra bottom padding for the fixed mobile tab bar (`< md`). */
  padForMobileBottomNav?: boolean;
  /**
   * When set with `mobileScrollListsOnly`, query/scope/category are controlled by the parent
   * (e.g. search field in `FeedComposerStrip`); inline chips + input are not rendered.
   */
  externalSearchState?: OrderflowSearchPanelExternalState;
  /**
   * Full-page feed search: render real post cards (same ordering as the feed) instead of compact typeahead rows.
   * When `feedSearchPostList` is set, it replaces hook `postHits` for the Posts section (full list, not top-N).
   */
  renderFeedSearchPost?: (post: Post) => React.ReactNode;
  feedSearchPostList?: Post[];
  feedSearchPostsLoading?: boolean;
};

export function InsightSearchPanel({
  onDismiss,
  applyFeedSearch = () => {},
  feedViewMode = 'explore',
  mobileScrollListsOnly = false,
  keyboardInsetPx = 0,
  padForMobileBottomNav = false,
  externalSearchState,
  renderFeedSearchPost,
  feedSearchPostList,
  feedSearchPostsLoading = false,
}: OrderflowSearchPanelProps) {
  const { user } = useAuth();
  const isDesktop = useIsDesktop();
  const closeDrawer = () => {};
  const [internalQuery, setInternalQuery] = useState('');
  const [historyItems, setHistoryItems] = useState<SearchHistoryItem[]>(() =>
    readSearchHistory()
  );
  const [internalCategory, setInternalCategory] = useState('');
  const [internalScope, setInternalScope] =
    useState<OrderflowSearchScope>('all');

  const searchQuery = externalSearchState?.query ?? internalQuery;
  const selectedCategory =
    externalSearchState?.selectedCategory ?? internalCategory;
  const searchScope = externalSearchState?.scope ?? internalScope;

  const feedPostCardsFromParent =
    typeof renderFeedSearchPost === 'function' &&
    feedSearchPostList !== undefined;
  const feedPostListItems = feedSearchPostList ?? [];
  const searchFeedPostPaging = useScrollPagedList({
    items: feedPostListItems,
    enabled:
      Boolean(feedPostCardsFromParent) &&
      feedPostListItems.length > 0 &&
      !feedSearchPostsLoading,
  });

  const setSearchQuery = (q: string) => {
    if (externalSearchState) externalSearchState.onQueryChange(q);
    else setInternalQuery(q);
  };
  const setSelectedCategory = (c: string) => {
    if (externalSearchState) externalSearchState.onSelectedCategoryChange(c);
    else setInternalCategory(c);
  };
  const setSearchScope = (s: OrderflowSearchScope) => {
    if (externalSearchState) externalSearchState.onScopeChange(s);
    else setInternalScope(s);
  };

  /** Match `ComposerTagPicker` / `AssetRows` “Recent” badge (composer localStorage). */
  const recentComposerAssetSet = useMemo(() => {
    return new Set(
      readRecentComposerAssets()
        .map((s) => s.replace(/^[#$]/, '').trim().toUpperCase())
        .filter(Boolean)
    );
  }, [searchQuery]);

  const recentComposerHashtagSet = useMemo(() => {
    return new Set(
      readRecentComposerHashtags()
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    );
  }, [searchQuery]);

  const {
    profiles,
    postHits,
    replyHits,
    hashtags,
    assets,
    categories: categoryMatches,
    isFetching,
  } = useInsightSearchSuggestions(
    searchQuery,
    user?.id,
    searchScope,
    feedViewMode,
    { tagSymbolTypeaheadAlways: Boolean(externalSearchState) }
  );

  /** Idle “Recent” list: show newest first, cap visible rows (storage may keep more). */
  const IDLE_RECENT_VISIBLE = 10;

  /** Use live text so results (profiles, posts, etc.) appear immediately; debounce only affects fetch timing inside the hook. */
  const showSuggestions = searchQuery.trim().length > 0;
  const showIdleSections = !searchQuery.trim();

  const liveParsed =
    showSuggestions ? parseSearchQuery(searchQuery.trim()) : null;
  /** `$…` in the field: asset picker only (composer-style), no people/posts/tags/categories. */
  const assetIntentOnly = liveParsed?.intent === 'asset';

  /** When the query is `#…` or `$…`, surface tag/symbol lists first (same idea as the post composer). */
  const suggestionIntent = showSuggestions
    ? parseSearchQuery(searchQuery.trim()).intent
    : null;
  const feedColumnSearch = Boolean(externalSearchState);
  const suggestionSectionOrder = (() => {
    if (suggestionIntent === 'hashtag') {
      return {
        profiles: 'order-2',
        posts: 'order-3',
        assets: 'order-4',
        hashtags: 'order-1',
        categories: 'order-5',
      } as const;
    }
    if (suggestionIntent === 'asset') {
      return {
        profiles: 'order-2',
        posts: 'order-3',
        assets: 'order-1',
        hashtags: 'order-4',
        categories: 'order-5',
      } as const;
    }
    if (feedColumnSearch && suggestionIntent === 'general') {
      return {
        profiles: 'order-1',
        assets: 'order-2',
        hashtags: 'order-3',
        posts: 'order-4',
        categories: 'order-5',
      } as const;
    }
    /** General search (e.g. drawer): same section order as full-page feed search. */
    return {
      profiles: 'order-1',
      assets: 'order-2',
      hashtags: 'order-3',
      posts: 'order-4',
      categories: 'order-5',
    } as const;
  })();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.trim();
    const parsed = parseSearchQuery(q);
    if (parsed.intent === 'asset' || parsed.intent === 'hashtag') {
      setHistoryItems(
        pushSearchHistory({
          id: searchHistoryIdForQuery(q),
          type: 'query',
          value: q,
          label: q,
        })
      );
      closeDrawer();
      openInsightCommunityTagOrSymbol(q);
      onDismiss?.();
      return;
    }
    setHistoryItems(
      pushSearchHistory({
        id: searchHistoryIdForQuery(q),
        type: 'query',
        value: q,
        label: q,
      })
    );
    applyFeedSearch(q, selectedCategory, searchScope);
  };

  const handleCategorySelect = (category: { value: string; label: string }) => {
    setSelectedCategory(category.value);
    setSearchQuery(category.label);
    setHistoryItems(
      pushSearchHistory({
        id: `cat:${category.value}`,
        type: 'query',
        value: category.value,
        label: category.label,
      })
    );
    applyFeedSearch('', category.value, searchScope);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setSelectedCategory('');
  };

  const handleQuickSearch = (query: string) => {
    const q = query.trim();
    setSearchQuery(query);
    setHistoryItems(
      pushSearchHistory({
        id: searchHistoryIdForQuery(q),
        type: 'query',
        value: q,
        label: q,
      })
    );
    const parsed = parseSearchQuery(q);
    if (parsed.intent === 'asset' || parsed.intent === 'hashtag') {
      closeDrawer();
      openInsightCommunityTagOrSymbol(q);
      onDismiss?.();
      return;
    }
    applyFeedSearch(query, '', searchScope);
  };

  const onRecentItemTap = (item: SearchHistoryItem) => {
    if (item.id.startsWith('cat:')) {
      const cat = ORDERFLOW_FEED_CATEGORIES.find((c) => c.value === item.value);
      if (cat) handleCategorySelect(cat);
      return;
    }
    if (item.type === 'profile') {
      setHistoryItems(
        pushSearchHistory({
          id: searchHistoryIdForProfile(item.value),
          type: 'profile',
          value: item.value,
          label: item.label ?? '',
          avatarUrl: item.avatarUrl,
        })
      );
      closeDrawer();
      openInsightCommunityProfile(item.value);
      onDismiss?.();
      return;
    }
    if (item.type === 'hashtag') {
      const tag = item.value.replace(/^#/, '').toLowerCase();
      setHistoryItems(
        pushSearchHistory({
          id: searchHistoryIdForHashtag(tag),
          type: 'hashtag',
          value: tag,
          label: item.label ?? tag,
        })
      );
      closeDrawer();
      openInsightCommunityTagOrSymbol(tag);
      onDismiss?.();
      return;
    }
    if (item.type === 'symbol') {
      setHistoryItems(
        pushSearchHistory({
          id: searchHistoryIdForSymbol(item.value),
          type: 'symbol',
          value: item.value.replace(/^\$/, '').toUpperCase(),
          label: item.label ?? item.value,
        })
      );
      closeDrawer();
      openInsightCommunityTagOrSymbol(item.value.replace(/^\$/, ''));
      onDismiss?.();
      return;
    }
    handleQuickSearch(item.value);
  };

  const scopeChipRow = (layout: 'horizontal' | 'vertical') => (
    <div
      className={cn(
        layout === 'horizontal' &&
          'flex gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        layout === 'vertical' && 'flex flex-col gap-2'
      )}
    >
      {ORDERFLOW_SEARCH_SCOPE_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => {
            const next = opt.id as OrderflowSearchScope;
            setSearchScope(next);
            if (externalSearchState && searchQuery.trim()) {
              applyFeedSearch(searchQuery.trim(), selectedCategory, next);
            }
          }}
          className={cn(
            scopeChipBase,
            layout === 'vertical' && 'w-full text-left justify-start',
            searchScope === opt.id
              ? 'border border-border/80 bg-muted text-foreground shadow-sm'
              : 'bg-muted/70 text-muted-foreground transition-colors hover:bg-muted/25 hover:text-foreground dark:bg-muted/50'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  const searchChrome = (opts: { mode: 'stickyUnderFixedStrip' | 'flow' }) => (
    <div
      className={cn(
        opts.mode === 'stickyUnderFixedStrip' && 'sticky z-[25]',
        opts.mode === 'flow' && 'shrink-0',
        '-mx-1 px-1 pt-1 pb-3',
        orderflowGlassBackdropClassName,
        'border-b border-border/50 shadow-sm',
        'flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6'
      )}
      style={
        opts.mode === 'stickyUnderFixedStrip'
          ? {
              top: `var(${ORDERFLOW_FEED_STRIP_HEIGHT_CSS_VAR}, 3.75rem)`,
            }
          : undefined
      }
    >
      {isDesktop ? (
        <aside className="hidden lg:flex lg:w-44 shrink-0 flex-col gap-2 border-r border-border/50 pr-4">
          <span className="text-xs font-medium text-muted-foreground px-0.5">
            Scope
          </span>
          {scopeChipRow('vertical')}
        </aside>
      ) : (
        scopeChipRow('horizontal')
      )}

      <div className="min-w-0 flex-1">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
            {isFetching && showSuggestions ? (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground pointer-events-none" />
            ) : null}
            <input
              type="text"
              value={searchQuery}
              onChange={handleInputChange}
              placeholder="Search, #hashtag, or $SYMBOL"
              className="w-full rounded-full border border-border/80 bg-muted/50 py-2.5 pl-10 pr-10 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-0 dark:bg-muted/40"
              autoFocus
              aria-label="Search, hashtag with number sign, or symbol with dollar sign"
            />
          </div>
        </form>
      </div>
    </div>
  );

  const listSections = (
    <>
      {showSuggestions ? (
        <div className="flex flex-col space-y-3">
          {!assetIntentOnly &&
          (searchScope === 'all' || searchScope === 'profiles') &&
          profiles.length > 0 ? (
            <div className={suggestionSectionOrder.profiles}>
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Profiles
              </div>
              <div className="space-y-1">
                {profiles.map((p) => {
                  const display = (p.display_name ?? '').trim();
                  const realRaw = (p.real_name ?? '').trim();
                  const realSubtitle =
                    realRaw &&
                    realRaw.toLowerCase() !== display.toLowerCase()
                      ? realRaw
                      : null;
                  const locRaw = (p.location ?? '').trim();
                  const isSelf = Boolean(user?.id && user.id === p.id);
                  const following = Boolean(p.isFollowing);
                  const level = p.trader_level?.trim() || 'Apprentice';
                  const tier = p.community_tier ?? 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={cn(
                        rowBtn,
                        'items-start justify-between gap-3 py-3 sm:py-2.5'
                      )}
                      onClick={() => {
                        setHistoryItems(
                          pushSearchHistory({
                            id: searchHistoryIdForProfile(p.id),
                            type: 'profile',
                            value: p.id,
                            label: p.display_name ?? '',
                            avatarUrl: p.avatar_url,
                          })
                        );
                        closeDrawer();
                        openInsightCommunityProfile(p.id);
                        onDismiss?.();
                      }}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:gap-3">
                        <div className="shrink-0 pt-0.5">
                          <EnhancedAvatar
                            src={p.avatar_url ?? undefined}
                            alt={display || 'Profile'}
                            fallback={
                              display
                                ? display.charAt(0).toUpperCase()
                                : '?'
                            }
                            level={level}
                            tier={tier}
                            size="sm"
                            className="border border-border/70 shadow-sm"
                          />
                        </div>
                        <div className="min-w-0 flex-1 text-left leading-tight">
                          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0 leading-tight">
                            <span className="min-w-0 truncate text-base font-semibold text-foreground">
                              {p.display_name}
                            </span>
                            <AuthorAtLevelPill level={level} />
                          </div>
                          {realSubtitle ? (
                            <span className="mt-px block truncate text-xs text-muted-foreground">
                              {realSubtitle}
                            </span>
                          ) : null}
                          {locRaw ? (
                            <div
                              className={cn(
                                'truncate text-left text-[11px] text-zinc-300 sm:text-xs dark:text-zinc-400',
                                realSubtitle ? 'mt-px' : 'mt-0'
                              )}
                            >
                              Lives in {locRaw}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      {isSelf ? (
                        <span className="mt-0.5 inline-flex shrink-0 items-center rounded-full border border-border/70 bg-muted/35 px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                          You
                        </span>
                      ) : (
                        <span
                          className={cn(
                            'mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border border-border/80',
                            'bg-muted/40 px-2 py-1 text-[11px] font-semibold leading-none',
                            following
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                          )}
                        >
                          {following ? (
                            <UserCheck className="h-3 w-3 shrink-0 opacity-90" />
                          ) : (
                            <UserPlus className="h-3 w-3 shrink-0 opacity-90" />
                          )}
                          {following ? 'Following' : 'Follow'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {!assetIntentOnly &&
          showSuggestions &&
          searchScope === 'profiles' &&
          !isFetching &&
          profiles.length === 0 ? (
            <div className={suggestionSectionOrder.profiles}>
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Profiles
              </div>
              <p className={searchNoResultsClassName}>
                No people found matching your search criteria.
              </p>
            </div>
          ) : null}

          {(() => {
            const parsedSearch = parseSearchQuery(searchQuery.trim());
            const postBucketActive =
              parsedSearch.intent !== 'asset' &&
              (searchScope === 'posts' ||
                (searchScope === 'all' &&
                  (parsedSearch.intent === 'general' ||
                    parsedSearch.intent === 'hashtag')));

            const hasFeedPosts =
              feedPostCardsFromParent && feedSearchPostList!.length > 0;
            const hasCompactPostHits = postHits.length > 0;
            const hasReplies = replyHits.length > 0;
            const postsHasAnyContent =
              hasFeedPosts || hasReplies || hasCompactPostHits;
            const postsIsLoading =
              Boolean(feedPostCardsFromParent) && feedSearchPostsLoading;
            const postsIsEmptyWhenReady =
              postBucketActive &&
              !hasReplies &&
              !postsIsLoading &&
              (feedPostCardsFromParent
                ? feedSearchPostList.length === 0
                : !hasCompactPostHits) &&
              !isFetching;

            const showPostsSection =
              postBucketActive &&
              (postsHasAnyContent || postsIsLoading || postsIsEmptyWhenReady);

            if (!showPostsSection) {
              return null;
            }
            return (
              <div className={suggestionSectionOrder.posts}>
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Posts &amp; replies
                </div>
                {feedPostCardsFromParent ? (
                  <div className="space-y-4">
                    {feedSearchPostsLoading ? (
                      <PostListSkeleton count={5} />
                    ) : hasFeedPosts ? (
                      <InsightPagedList
                        visibleItems={searchFeedPostPaging.visibleItems}
                        hasMore={searchFeedPostPaging.hasMore}
                        isAppending={searchFeedPostPaging.isAppending}
                        sentinelRef={searchFeedPostPaging.sentinelRef}
                        getKey={(post) => post.id}
                      >
                        {(post) => (
                          <div className="min-w-0">
                            {renderFeedSearchPost!(post)}
                          </div>
                        )}
                      </InsightPagedList>
                    ) : postsIsEmptyWhenReady ? (
                      <p className={searchNoResultsClassName}>
                        No posts found matching your search criteria.
                      </p>
                    ) : null}
                    {hasReplies ? (
                      <div className="space-y-1 pt-1">
                        {replyHits.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            className={rowBtn}
                            onClick={() => {
                              closeDrawer();
                              openInsightCommunityComments(r.post_id, r.id);
                              onDismiss?.();
                            }}
                          >
                            <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="flex min-w-0 flex-col items-start gap-0.5">
                              <span className="truncate text-xs text-muted-foreground w-full text-left">
                                {r.postTitle
                                  ? `Reply on: ${clipText(r.postTitle, 48)}`
                                  : 'Reply'}
                              </span>
                              <span className="truncate w-full text-left text-sm">
                                {clipText(r.content, 100)}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : postsIsEmptyWhenReady ? (
                  <p className={searchNoResultsClassName}>
                    No posts found matching your search criteria.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {postHits.map(({ post }) => (
                      <button
                        key={post.id}
                        type="button"
                        className={rowBtn}
                        onClick={() => {
                          closeDrawer();
                          openInsightCommunityComments(post.id);
                          onDismiss?.();
                        }}
                      >
                        <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="flex min-w-0 flex-col items-start gap-0.5">
                          <span className="truncate font-medium w-full text-left">
                            {clipText(post.title, 72)}
                          </span>
                          <span className="truncate text-xs text-muted-foreground w-full text-left">
                            {post.author.display_name ?? 'Trader'}
                          </span>
                        </span>
                      </button>
                    ))}
                    {replyHits.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        className={rowBtn}
                        onClick={() => {
                          closeDrawer();
                          openInsightCommunityComments(r.post_id, r.id);
                          onDismiss?.();
                        }}
                      >
                        <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="flex min-w-0 flex-col items-start gap-0.5">
                          <span className="truncate text-xs text-muted-foreground w-full text-left">
                            {r.postTitle
                              ? `Reply on: ${clipText(r.postTitle, 48)}`
                              : 'Reply'}
                          </span>
                          <span className="truncate w-full text-left text-sm">
                            {clipText(r.content, 100)}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {(searchScope === 'all' ||
            searchScope === 'assets' ||
            assetIntentOnly) &&
          assets.length > 0 ? (
            <div className={suggestionSectionOrder.assets}>
              {assetIntentOnly && liveParsed ? (
                (() => {
                  const queryEmpty =
                    liveParsed.intent === 'asset' && !liveParsed.needleLower;
                  const rows: AssetRowTagged[] = assets.map((a) => ({
                    ...a,
                    isRecent: recentComposerAssetSet.has(
                      a.label.toUpperCase()
                    ),
                  }));
                  const { recent, equities, crypto, forex, commodity } =
                    groupSearchAssetsLikeComposer(rows, queryEmpty);

                  const pickAsset = (label: string) => {
                    setHistoryItems(
                      pushSearchHistory({
                        id: searchHistoryIdForSymbol(label),
                        type: 'symbol',
                        value: label,
                        label,
                      })
                    );
                    closeDrawer();
                    openInsightCommunityTagOrSymbol(label);
                    onDismiss?.();
                  };

                  const sectionGap = (hasPrior: boolean) =>
                    hasPrior ? 'mt-2' : undefined;

                  return (
                    <div className="flex flex-col gap-1">
                      {recent.length > 0 ? (
                        <>
                          <div className={assetPickerSectionTitleClass}>
                            Recent
                          </div>
                          <div className="space-y-1">
                            {recent.map((a) => (
                              <OrderflowAssetPickerRow
                                key={`${a.label}-recent`}
                                a={a}
                                isRecent
                                onPick={() => pickAsset(a.label)}
                              />
                            ))}
                          </div>
                        </>
                      ) : null}
                      {equities.length > 0 ? (
                        <>
                          <div
                            className={cn(
                              assetPickerSectionTitleClass,
                              sectionGap(recent.length > 0)
                            )}
                          >
                            Stocks &amp; ETFs
                          </div>
                          <div className="space-y-1">
                            {equities.map((a) => (
                              <OrderflowAssetPickerRow
                                key={a.label}
                                a={a}
                                isRecent={a.isRecent}
                                onPick={() => pickAsset(a.label)}
                              />
                            ))}
                          </div>
                        </>
                      ) : null}
                      {crypto.length > 0 ? (
                        <>
                          <div
                            className={cn(
                              assetPickerSectionTitleClass,
                              sectionGap(
                                recent.length > 0 || equities.length > 0
                              )
                            )}
                          >
                            Crypto
                          </div>
                          <div className="space-y-1">
                            {crypto.map((a) => (
                              <OrderflowAssetPickerRow
                                key={a.label}
                                a={a}
                                isRecent={a.isRecent}
                                onPick={() => pickAsset(a.label)}
                              />
                            ))}
                          </div>
                        </>
                      ) : null}
                      {forex.length > 0 ? (
                        <>
                          <div
                            className={cn(
                              assetPickerSectionTitleClass,
                              sectionGap(
                                recent.length > 0 ||
                                  equities.length > 0 ||
                                  crypto.length > 0
                              )
                            )}
                          >
                            Forex
                          </div>
                          <div className="space-y-1">
                            {forex.map((a) => (
                              <OrderflowAssetPickerRow
                                key={a.label}
                                a={a}
                                isRecent={a.isRecent}
                                onPick={() => pickAsset(a.label)}
                              />
                            ))}
                          </div>
                        </>
                      ) : null}
                      {commodity.length > 0 ? (
                        <>
                          <div
                            className={cn(
                              assetPickerSectionTitleClass,
                              sectionGap(
                                recent.length > 0 ||
                                  equities.length > 0 ||
                                  crypto.length > 0 ||
                                  forex.length > 0
                              )
                            )}
                          >
                            Commodities
                          </div>
                          <div className="space-y-1">
                            {commodity.map((a) => (
                              <OrderflowAssetPickerRow
                                key={a.label}
                                a={a}
                                isRecent={a.isRecent}
                                onPick={() => pickAsset(a.label)}
                              />
                            ))}
                          </div>
                        </>
                      ) : null}
                    </div>
                  );
                })()
              ) : (
                <>
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Symbols
                  </div>
                  <div className="space-y-1">
                    {assets.map((a) => (
                      <OrderflowAssetPickerRow
                        key={a.label}
                        a={a}
                        isRecent={recentComposerAssetSet.has(
                          a.label.toUpperCase()
                        )}
                        onPick={() => {
                          setHistoryItems(
                            pushSearchHistory({
                              id: searchHistoryIdForSymbol(a.label),
                              type: 'symbol',
                              value: a.label,
                              label: a.label,
                            })
                          );
                          closeDrawer();
                          openInsightCommunityTagOrSymbol(a.label);
                          onDismiss?.();
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : null}

          {showSuggestions &&
          (searchScope === 'assets' || assetIntentOnly) &&
          !isFetching &&
          assets.length === 0 ? (
            <div className={suggestionSectionOrder.assets}>
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Symbols
              </div>
              <p className={searchNoResultsClassName}>
                No symbols found matching your search criteria.
              </p>
            </div>
          ) : null}

          {!assetIntentOnly &&
          (searchScope === 'all' || searchScope === 'hashtags') &&
          hashtags.length > 0 ? (
            <div className={suggestionSectionOrder.hashtags}>
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Hashtags
              </div>
              <div className="space-y-1">
                {hashtags.map((h) => {
                  const tagRecent = recentComposerHashtagSet.has(
                    h.label.toLowerCase()
                  );
                  const showHashtagCount = h.frequency > 0 || tagRecent;
                  return (
                    <button
                      key={h.label}
                      type="button"
                      className={cn(
                        rowBtn,
                        'justify-between gap-3 text-muted-foreground'
                      )}
                      onClick={() => {
                        setHistoryItems(
                          pushSearchHistory({
                            id: searchHistoryIdForHashtag(h.label),
                            type: 'hashtag',
                            value: h.label.toLowerCase(),
                            label: h.label,
                          })
                        );
                        closeDrawer();
                        openInsightCommunityTagOrSymbol(h.label);
                        onDismiss?.();
                      }}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <HashtagLeadingCircle />
                        <span className="min-w-0 truncate font-medium text-foreground">
                          #{h.label}
                        </span>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                        {tagRecent ? (
                          <span className="text-[10px] font-medium uppercase text-muted-foreground">
                            Recent
                          </span>
                        ) : null}
                        {showHashtagCount ? (
                          <span className="tabular-nums text-xs text-muted-foreground">
                            {h.frequency === 0
                              ? '0 posts'
                              : `${formatCompactPostCount(h.frequency)} ${h.frequency === 1 ? 'post' : 'posts'}`}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {!assetIntentOnly &&
          showSuggestions &&
          searchScope === 'hashtags' &&
          !isFetching &&
          hashtags.length === 0 ? (
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Hashtags
              </div>
              <p className={searchNoResultsClassName}>
                No hashtags found matching your search criteria.
              </p>
            </div>
          ) : null}

          {searchScope === 'all' &&
          !assetIntentOnly &&
          categoryMatches.length > 0 ? (
            <div className={suggestionSectionOrder.categories}>
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Categories
              </div>
              <div className="space-y-1">
                {categoryMatches.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={rowBtn}
                    onClick={() => handleCategorySelect(c)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {showIdleSections ? (
        <>
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-sm font-medium text-muted-foreground">
                Recent
              </div>
              {historyItems.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    clearSearchHistory();
                    setHistoryItems([]);
                  }}
                  className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Edit
                </button>
              ) : null}
            </div>
            {historyItems.length === 0 ? (
              <p className="px-1 text-sm text-muted-foreground">
                No recent searches
              </p>
            ) : (
              <div className="space-y-1">
                {historyItems.slice(0, IDLE_RECENT_VISIBLE).map((item) => (
                  <div
                    key={item.id}
                    className="flex min-w-0 items-stretch gap-0 overflow-hidden rounded-md"
                  >
                    <button
                      type="button"
                      className={cn(
                        rowBtn,
                        'min-w-0 flex-1 rounded-r-none border border-transparent pr-1'
                      )}
                      onClick={() => onRecentItemTap(item)}
                    >
                      {item.type === 'profile' ? (
                        <>
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage
                              src={item.avatarUrl ?? undefined}
                              alt=""
                              className="object-cover"
                            />
                            <AvatarFallback className="text-xs">
                              {profileInitials(item.label ?? '?')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">
                            {item.label ?? item.value}
                          </span>
                        </>
                      ) : item.type === 'hashtag' ? (
                        (() => {
                          const tag = (item.label ?? item.value)
                            .replace(/^#/, '')
                            .trim();
                          const safe = tag || '?';
                          return (
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <HashtagLeadingCircle />
                              <div className="min-w-0 flex-1 text-left">
                                <div className="truncate text-sm font-bold leading-tight">
                                  #{safe}
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      ) : item.type === 'symbol' ? (
                        (() => {
                          const sym = (item.label ?? item.value)
                            .replace(/^\$/, '')
                            .trim()
                            .toUpperCase();
                          const safe = sym || '?';
                          const dn = getSymbolInfo(safe).displayName;
                          return (
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold uppercase text-foreground ring-1 ring-border/60 sm:h-10 sm:w-10 sm:text-[11px]">
                                {safe.slice(0, 2)}
                              </div>
                              <div className="min-w-0 flex-1 text-left">
                                <div className="truncate text-sm font-bold leading-tight">
                                  ${safe}
                                </div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {dn}
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      ) : item.id.startsWith('cat:') ? (
                        <>
                          <span className="truncate text-muted-foreground">
                            Category · {item.label ?? item.value}
                          </span>
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">
                            {item.label ?? item.value}
                          </span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      aria-label="Remove from recent"
                      className="shrink-0 rounded-md rounded-l-none border border-transparent px-2 py-2 text-muted-foreground transition-colors hover:bg-muted/25 hover:text-foreground"
                      onClick={() =>
                        setHistoryItems(removeSearchHistoryItem(item.id))
                      }
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </>
  );

  const hideInlineSearchChrome = Boolean(externalSearchState);

  if (mobileScrollListsOnly) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {!hideInlineSearchChrome ? searchChrome({ mode: 'flow' }) : null}
        <div
          className={cn(
            'min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden overscroll-contain',
            hideInlineSearchChrome ? 'pt-2' : 'pt-4',
            padForMobileBottomNav
              ? 'pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+var(--keyboard-inset,0px)+4.5rem))]'
              : 'pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+var(--keyboard-inset,0px)+1.5rem))]'
          )}
          style={
            {
              '--keyboard-inset': `${keyboardInsetPx}px`,
            } as React.CSSProperties
          }
        >
          {listSections}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      {!hideInlineSearchChrome ? (
        searchChrome({ mode: 'stickyUnderFixedStrip' })
      ) : null}

      <div
        className={cn(
          'space-y-4',
          hideInlineSearchChrome ? 'pt-2' : 'pt-4'
        )}
      >
        {listSections}
      </div>
    </div>
  );
}
