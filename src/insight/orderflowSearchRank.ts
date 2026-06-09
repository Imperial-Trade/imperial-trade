import type { Post } from '@/insight/insightPost';
import {
  getCanonicalAssetListLabel,
  isFinancialAsset,
  symbolMapper,
} from '@/insight/symbolMapper';

const OFI_B_FOLLOW = 0.22;
const OFI_B_SELF = 0.35;

/** Search-feed social boost: same relationship weights as OFI (`orderflowFeedRank`), scaled for relevance scores. */
const OFI_SEARCH_SOCIAL_SCALE = 50_000;

export type SearchIntent = 'general' | 'hashtag' | 'asset';

export const HASHTAG_REGEX = /#([A-Za-z0-9_]+)/g;
export const ASSET_REGEX = /\$([A-Za-z]{1,5})\b/g;

export type ParsedSearchQuery = {
  intent: SearchIntent;
  /** Lowercase needle for fuzzy text / ilike (tag part, symbol letters, or free text). */
  needleLower: string;
  /** Original trimmed user input for display and feed events. */
  displayNeedle: string;
};

export function parseSearchQuery(input: string | null | undefined): ParsedSearchQuery {
  const raw = (input ?? '').trim();
  if (raw.startsWith('#')) {
    const inner = raw.slice(1).trim();
    if (inner && isFinancialAsset(`#${inner}`)) {
      const canon = getCanonicalAssetListLabel(inner.toUpperCase());
      return {
        intent: 'asset',
        needleLower: canon.toLowerCase(),
        displayNeedle: raw,
      };
    }
    return {
      intent: 'hashtag',
      needleLower: inner.toLowerCase(),
      displayNeedle: raw,
    };
  }
  if (raw.startsWith('$')) {
    const sym = raw.slice(1).trim().toUpperCase();
    return {
      intent: 'asset',
      needleLower: sym.toLowerCase(),
      displayNeedle: raw,
    };
  }
  return {
    intent: 'general',
    needleLower: raw.toLowerCase(),
    displayNeedle: raw,
  };
}

/** Strip chars that break PostgREST `ilike` patterns. */
export function sanitizeIlikeNeedle(s: string): string {
  return s.replace(/[%_\\]/g, '');
}

export function scoreSearchMatch(needleLower: string, textLower: string): number {
  if (!needleLower || !textLower) return 0;
  if (textLower === needleLower) return 1000;
  if (textLower.startsWith(needleLower)) return 800;
  const tokens = textLower.split(/[^a-z0-9]+/).filter(Boolean);
  if (tokens.some((t) => t.startsWith(needleLower))) return 650;
  if (textLower.includes(needleLower)) return 400;
  return 0;
}

export type RankedComparable = {
  score: number;
  label: string;
  frequency?: number;
};

/** Higher score first; shorter label; higher frequency; alphabetical. */
export function compareRanked(a: RankedComparable, b: RankedComparable): number {
  if (b.score !== a.score) return b.score - a.score;
  if (a.label.length !== b.label.length) return a.label.length - b.label.length;
  const fa = a.frequency ?? 0;
  const fb = b.frequency ?? 0;
  if (fb !== fa) return fb - fa;
  return a.label.localeCompare(b.label);
}

/** Merge rows that share the same instrument (e.g. `GOLD` + `XAUUSD` → one `XAUUSD` row, summed frequency). */
export function dedupeAssetSuggestionsByCanonicalSymbol(
  rows: ComposerTagSuggestionRow[]
): ComposerTagSuggestionRow[] {
  const merged = new Map<string, ComposerTagSuggestionRow>();
  for (const r of rows) {
    const canon = getCanonicalAssetListLabel(r.label);
    const ex = merged.get(canon);
    if (!ex) {
      merged.set(canon, { ...r, label: canon });
    } else {
      merged.set(canon, {
        ...ex,
        label: canon,
        frequency: ex.frequency + r.frequency,
        score: Math.max(ex.score, r.score),
        isRecent: Boolean(
          (ex as ComposerTagSuggestionRow).isRecent ||
            (r as ComposerTagSuggestionRow).isRecent
        ),
      });
    }
  }
  return [...merged.values()];
}

/** Same shape as hashtag/symbol rows in search suggestions. */
export type ComposerTagSuggestionRow = {
  label: string;
  score: number;
  frequency: number;
  /** True when row comes from local “recent picks” (empty-query StockTwits-style). */
  isRecent?: boolean;
  /** Asset display name from `symbolMapper` / fallback (asset picker UI). */
  displayName?: string;
  /** User is creating a new hashtag not yet in the feed list. */
  isCreateNew?: boolean;
};

/** Trending hashtags when the query is empty (frequency only). */
export function topHashtagsByFrequency(
  tagCounts: Map<string, number>,
  topN: number
): ComposerTagSuggestionRow[] {
  return [...tagCounts.entries()]
    .map(([label, frequency]) => ({ label, score: 0, frequency }))
    .sort((a, b) => b.frequency - a.frequency || a.label.localeCompare(b.label))
    .slice(0, topN);
}

/** Trending symbols when the query is empty (frequency only). */
export function topSymbolsByFrequency(
  symbolCounts: Map<string, number>,
  topN: number,
  symbolFilter: (s: string) => boolean
): ComposerTagSuggestionRow[] {
  const rows = [...symbolCounts.entries()]
    .filter(([sym]) => symbolFilter(sym))
    .map(([label, frequency]) => ({ label, score: 0, frequency }));
  const deduped = dedupeAssetSuggestionsByCanonicalSymbol(rows);
  return deduped
    .sort((a, b) => b.frequency - a.frequency || a.label.localeCompare(b.label))
    .slice(0, topN);
}

/**
 * Rank hashtag suggestions from cached counts (same rules as search typeahead).
 * Empty needle: frequency-only trending.
 */
export function rankHashtagSuggestionsFromCounts(
  tagCounts: Map<string, number>,
  needleLower: string,
  intent: SearchIntent,
  topN: number
): ComposerTagSuggestionRow[] {
  if (!needleLower) {
    return topHashtagsByFrequency(tagCounts, topN);
  }
  const rows: ComposerTagSuggestionRow[] = [];
  const n = needleLower;
  for (const [tag, freq] of tagCounts) {
    let sc = scoreSearchMatch(n, tag);
    if (intent === 'hashtag') {
      if (!n || sc === 0) continue;
      if (tag === n) sc += 200;
    } else if (!n || sc === 0) {
      continue;
    }
    rows.push({ label: tag, score: sc, frequency: freq });
  }
  rows.sort((a, b) =>
    compareRanked(
      { score: a.score, label: a.label, frequency: a.frequency },
      { score: b.score, label: b.label, frequency: b.frequency }
    )
  );
  return rows.slice(0, topN);
}

/**
 * Rank asset suggestions from cached counts (same rules as search typeahead).
 * Empty needle: frequency-only trending.
 * Optional `symbolFilter` — e.g. composer only suggests valid tickers.
 */
export function rankAssetSuggestionsFromCounts(
  symbolCounts: Map<string, number>,
  needleLower: string,
  intent: SearchIntent,
  topN: number,
  symbolFilter?: (s: string) => boolean
): ComposerTagSuggestionRow[] {
  const pass = symbolFilter ?? (() => true);
  if (!needleLower) {
    return topSymbolsByFrequency(symbolCounts, topN, pass);
  }
  const rows: ComposerTagSuggestionRow[] = [];
  const n = needleLower;
  for (const [sym, freq] of symbolCounts) {
    if (!pass(sym)) continue;
    const symL = sym.toLowerCase();
    let sc = scoreSearchMatch(n, symL);
    if (intent === 'asset') {
      if (!n || sc === 0) continue;
      if (symL === n) sc += 200;
    } else if (!n || sc === 0) {
      continue;
    }
    rows.push({ label: sym, score: sc, frequency: freq });
  }
  rows.sort((a, b) =>
    compareRanked(
      { score: a.score, label: a.label, frequency: a.frequency },
      { score: b.score, label: b.label, frequency: b.frequency }
    )
  );
  return rows.slice(0, topN);
}

const MAX_COMPOSER_HASHTAG_LEN = 60;

/**
 * Prefix / substring match against the full `symbolMapper` catalog (stocks, crypto, forex, commodities).
 * Merged with feed-ranked rows so search is not limited to symbols that appeared in posts.
 */
export function searchSymbolCatalogForComposer(
  needleLower: string,
  limit: number
): ComposerTagSuggestionRow[] {
  if (!needleLower) return [];
  const n = needleLower;
  const rows: ComposerTagSuggestionRow[] = [];
  for (const [sym, info] of Object.entries(symbolMapper)) {
    const symL = sym.toLowerCase();
    const nameL = info.displayName.toLowerCase();
    let sc = 0;
    if (symL === n) sc = 1000;
    else if (symL.startsWith(n)) sc = 820;
    else if (nameL.includes(n)) sc = 450;
    else if (symL.includes(n)) sc = 350;
    else continue;
    rows.push({ label: sym, score: sc, frequency: 0 });
  }
  const deduped = dedupeAssetSuggestionsByCanonicalSymbol(rows);
  deduped.sort((a, b) =>
    compareRanked(
      { score: a.score, label: a.label, frequency: a.frequency },
      { score: b.score, label: b.label, frequency: b.frequency }
    )
  );
  return deduped.slice(0, limit);
}

/**
 * Browse symbols alphabetically from the catalog (e.g. bare `$` in search when feed/recents are empty).
 */
export function browseSymbolCatalogAlphabetical(
  limit: number,
  excludeUppercase: Set<string>
): ComposerTagSuggestionRow[] {
  const excludedCanonical = new Set(
    [...excludeUppercase].map((s) => getCanonicalAssetListLabel(s))
  );
  const out: ComposerTagSuggestionRow[] = [];
  const seenCanonical = new Set<string>();
  for (const sym of Object.keys(symbolMapper).sort()) {
    const u = sym.toUpperCase();
    const canon = getCanonicalAssetListLabel(u);
    if (excludedCanonical.has(canon)) continue;
    if (seenCanonical.has(canon)) continue;
    seenCanonical.add(canon);
    out.push({ label: canon, score: 0, frequency: 0 });
    if (out.length >= limit) break;
  }
  return out;
}

/** Combine feed-frequency matches with catalog matches; dedupe by symbol, keep max score + feed frequency. */
export function mergeAssetFeedAndCatalog(
  feedRows: ComposerTagSuggestionRow[],
  catalogRows: ComposerTagSuggestionRow[],
  topN: number
): ComposerTagSuggestionRow[] {
  const byLabel = new Map<string, ComposerTagSuggestionRow>();
  for (const r of feedRows) {
    byLabel.set(r.label.toUpperCase(), { ...r });
  }
  for (const r of catalogRows) {
    const k = r.label.toUpperCase();
    const ex = byLabel.get(k);
    if (!ex) {
      byLabel.set(k, { ...r, frequency: 0 });
    } else {
      byLabel.set(k, {
        ...ex,
        score: Math.max(ex.score, r.score),
      });
    }
  }
  const merged = dedupeAssetSuggestionsByCanonicalSymbol([...byLabel.values()]);
  merged.sort((a, b) =>
    compareRanked(
      { score: a.score, label: a.label, frequency: a.frequency },
      { score: b.score, label: b.label, frequency: b.frequency }
    )
  );
  return merged.slice(0, topN);
}

/** When the typed hashtag is valid and not an exact match in the list, prepend a “create” row. */
export function appendCreateHashtagCandidate(
  needleLower: string,
  ranked: ComposerTagSuggestionRow[],
  topN: number
): ComposerTagSuggestionRow[] {
  const normalized = needleLower.replace(/[^a-z0-9_-]/gi, '').toLowerCase();
  if (!normalized || normalized.length > MAX_COMPOSER_HASHTAG_LEN) {
    return ranked.slice(0, topN);
  }
  if (!/^[a-z0-9_-]+$/.test(normalized)) {
    return ranked.slice(0, topN);
  }
  const hasExact = ranked.some((r) => r.label.toLowerCase() === normalized);
  if (hasExact) return ranked.slice(0, topN);
  if (isFinancialAsset(`#${normalized}`)) {
    return ranked.slice(0, topN);
  }
  const createRow: ComposerTagSuggestionRow = {
    label: normalized,
    score: 10_000,
    frequency: 0,
    isCreateNew: true,
  };
  return [createRow, ...ranked].slice(0, topN);
}

function symbolFromGeneralToken(s: string): string | null {
  const t = s.replace(/^#/, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (/^[A-Z]{1,5}$/.test(t)) return t;
  return null;
}

export function collectTagAndSymbolCounts(
  posts: Post[],
  maxPosts: number
): { tagCounts: Map<string, number>; symbolCounts: Map<string, number> } {
  const tagCounts = new Map<string, number>();
  const symbolCounts = new Map<string, number>();
  const slice = posts.length > maxPosts ? [...posts].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, maxPosts) : posts;

  for (const post of slice) {
    for (const tag of post.tags ?? []) {
      const base = tag.replace(/^#/, '');
      const tl = base.toLowerCase();
      if (tl) tagCounts.set(tl, (tagCounts.get(tl) ?? 0) + 1);
      const sym = symbolFromGeneralToken(base);
      if (sym) symbolCounts.set(sym, (symbolCounts.get(sym) ?? 0) + 1);
    }
    const text = `${post.title}\n${post.content}`;
    let m: RegExpExecArray | null;
    HASHTAG_REGEX.lastIndex = 0;
    while ((m = HASHTAG_REGEX.exec(text)) !== null) {
      const t = m[1].toLowerCase();
      tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    }
    ASSET_REGEX.lastIndex = 0;
    while ((m = ASSET_REGEX.exec(text)) !== null) {
      const s = m[1].toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (s) symbolCounts.set(s, (symbolCounts.get(s) ?? 0) + 1);
    }
  }

  reclassifyCatalogHashtagsToSymbolCounts(tagCounts, symbolCounts);
  return { tagCounts, symbolCounts };
}

/** `#xauusd`-style tokens that are catalog symbols belong with `$XAUUSD` / `$GOLD`, not the hashtag list. */
function reclassifyCatalogHashtagsToSymbolCounts(
  tagCounts: Map<string, number>,
  symbolCounts: Map<string, number>
): void {
  for (const [tagL, freq] of [...tagCounts.entries()]) {
    if (!isFinancialAsset(`#${tagL}`)) continue;
    const canon = getCanonicalAssetListLabel(tagL.toUpperCase());
    symbolCounts.set(canon, (symbolCounts.get(canon) ?? 0) + freq);
    tagCounts.delete(tagL);
  }
}

export type RankedPostHit = {
  post: Post;
  score: number;
};

/** Boost so following / self rank above pure text relevance (Meta-style). */
const SOCIAL_SCORE_SELF = (1 + OFI_B_SELF) * OFI_SEARCH_SOCIAL_SCALE;
const SOCIAL_SCORE_FOLLOWING = (1 + OFI_B_FOLLOW) * OFI_SEARCH_SOCIAL_SCALE;

const INLINE_TAG_HASH_BOOST = 750;
const INLINE_ASSET_BOOST = 750;

/**
 * How well `needleLower` matches a post without requiring a `#` or `$` prefix in the query:
 * title/body, tag list, literal `#needle` in text, and `$TICKER` tokens in text.
 */
export function postNeedleRelevanceScore(
  post: Post,
  needleLower: string
): number {
  if (!needleLower) return 0;
  const titleL = post.title.toLowerCase();
  const contentL = post.content.toLowerCase();
  let sc = Math.max(
    scoreSearchMatch(needleLower, titleL),
    scoreSearchMatch(needleLower, contentL)
  );
  const tagArr = post.tags ?? [];
  for (const t of tagArr) {
    const tl = t.toLowerCase();
    const stripped = tl.replace(/^[$#]/, '');
    sc = Math.max(sc, scoreSearchMatch(needleLower, stripped));
    sc = Math.max(sc, scoreSearchMatch(needleLower, tl));
  }
  const hay = `${post.title} ${post.content}`;
  const hayL = hay.toLowerCase();
  if (hayL.includes(`#${needleLower}`)) {
    sc = Math.max(sc, INLINE_TAG_HASH_BOOST);
  }
  ASSET_REGEX.lastIndex = 0;
  let sm: RegExpExecArray | null;
  while ((sm = ASSET_REGEX.exec(hay)) !== null) {
    const l = sm[1].toLowerCase();
    if (l === needleLower || l.startsWith(needleLower)) {
      sc = Math.max(sc, INLINE_ASSET_BOOST);
      break;
    }
  }
  return sc;
}

/** Rank cached forum posts by title/content text match (for search typeahead). Following/self first within same text tier. */
export function rankPostsByTextMatch(
  posts: Post[],
  needleLower: string,
  maxPosts: number,
  topN: number,
  currentUserId?: string
): RankedPostHit[] {
  if (!needleLower) return [];
  const slice =
    posts.length > maxPosts
      ? [...posts]
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, maxPosts)
      : posts;

  const hits: RankedPostHit[] = [];
  for (const post of slice) {
    let sc = postNeedleRelevanceScore(post, needleLower);
    if (currentUserId && post.author?.id === currentUserId) {
      sc += SOCIAL_SCORE_SELF;
    } else if (post.isFollowing) {
      sc += SOCIAL_SCORE_FOLLOWING;
    }
    if (sc > 0) hits.push({ post, score: sc });
  }
  hits.sort((a, b) =>
    compareRanked(
      {
        score: a.score,
        label: a.post.title.toLowerCase(),
        frequency: a.post.createdAt.getTime(),
      },
      {
        score: b.score,
        label: b.post.title.toLowerCase(),
        frequency: b.post.createdAt.getTime(),
      }
    )
  );
  return hits.slice(0, topN);
}

/**
 * Sort filtered feed posts when a text search is active: same social + relevance idea as typeahead.
 */
export function sortPostsForSearchFeed(
  posts: Post[],
  searchQuery: string,
  currentUserId: string | undefined
): Post[] {
  const trimmed = (searchQuery ?? '').trim();
  if (!trimmed) {
    return [...posts].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  const parsed = parseSearchQuery(searchQuery);
  const needleLower = parsed.needleLower;

  return [...posts]
    .map((post) => {
      let sc = needleLower ? postNeedleRelevanceScore(post, needleLower) : 0;
      if (
        needleLower &&
        parsed.intent !== 'general' &&
        sc === 0 &&
        postMatchesFeedSearch(post, searchQuery, '', 'all')
      ) {
        /* Hashtag / asset scoped queries: keep ordering stable when relevance is only in tag form. */
        sc = 1;
      }
      if (currentUserId && post.author?.id === currentUserId) {
        sc += SOCIAL_SCORE_SELF;
      } else if (post.isFollowing) {
        sc += SOCIAL_SCORE_FOLLOWING;
      }
      return { post, score: sc };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.post.createdAt.getTime() - a.post.createdAt.getTime();
    })
    .map((x) => x.post);
}

/**
 * Text/category filter for feed search. General queries match title/body, tags, `#tag` and `$TICKER`
 * tokens, and (when scope ≠ posts) author names. `#` / `$` narrow intent but are not required to match
 * tagged content.
 */
export function postMatchesFeedSearch(
  post: Post,
  searchQuery: string,
  selectedCategory: string,
  searchScope:
    | 'all'
    | 'profiles'
    | 'posts'
    | 'assets'
    | 'hashtags' = 'all'
): boolean {
  if (selectedCategory && post.category !== selectedCategory) {
    return false;
  }
  if (!(searchQuery ?? '').trim() || selectedCategory) {
    return true;
  }

  const parsed = parseSearchQuery(searchQuery);
  const content = `${post.title} ${post.content}`.toLowerCase();
  const tagArr = post.tags ?? [];

  if (parsed.intent === 'hashtag') {
    const tag = parsed.needleLower;
    if (!tag) return true;
    const inContent = content.includes(`#${tag}`);
    const inTags = tagArr.some((t) => {
      const tl = t.replace(/^#/, '').toLowerCase();
      return tl === tag || tl.includes(tag);
    });
    return inContent || inTags;
  }

  if (parsed.intent === 'asset') {
    const sym = parsed.displayNeedle.trim().startsWith('$')
      ? parsed.displayNeedle.trim().slice(1).trim().toUpperCase()
      : parsed.needleLower.toUpperCase();
    if (!sym) return true;
    const re = new RegExp(`\\$${sym}\\b`, 'i');
    const inContent = re.test(`${post.title} ${post.content}`);
    const inTags = tagArr.some((t) => t.toUpperCase().replace(/^#/, '') === sym);
    return inContent || inTags;
  }

  const n = parsed.needleLower;
  if (!n) return true;

  const nameHay = [
    post.author.display_name,
    post.author.real_name,
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());

  const inText = post.title.toLowerCase().includes(n) || post.content.toLowerCase().includes(n);
  const inTags = tagArr.some((t) => t.toLowerCase().includes(n));
  const hashMatch = content.includes(`#${n}`);
  const hay = `${post.title} ${post.content}`;
  let symMatch = false;
  ASSET_REGEX.lastIndex = 0;
  let sm: RegExpExecArray | null;
  while ((sm = ASSET_REGEX.exec(hay)) !== null) {
    const l = sm[1].toLowerCase();
    if (l === n || l.startsWith(n)) {
      symMatch = true;
      break;
    }
  }
  const inAuthor = nameHay.some((h) => h.includes(n));

  if (searchScope === 'posts') {
    return inText || inTags || hashMatch || symMatch;
  }
  return inText || inTags || hashMatch || symMatch || inAuthor;
}
