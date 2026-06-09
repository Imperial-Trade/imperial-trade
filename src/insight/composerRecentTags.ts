/**
 * Persist recently picked composer tags (StockTwits-style recents when search is empty).
 * Keys namespaced + versioned for safe migration.
 */

const STORAGE_ASSETS = 'orderflow:composerRecentAssets_v1';
const STORAGE_HASHTAGS = 'orderflow:composerRecentHashtags_v1';
const MAX_ASSETS = 24;
const MAX_HASHTAGS = 24;

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (raw == null || raw === '') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function readRecentComposerAssets(): string[] {
  if (typeof window === 'undefined') return [];
  const v = safeJsonParse<string[]>(window.localStorage.getItem(STORAGE_ASSETS), []);
  return Array.isArray(v)
    ? v.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : [];
}

export function pushRecentComposerAsset(symbol: string): void {
  if (typeof window === 'undefined') return;
  const upper = symbol.replace(/^[#$]/, '').trim().toUpperCase();
  if (!upper) return;
  const prev = readRecentComposerAssets().filter((s) => s !== upper);
  const next = [upper, ...prev].slice(0, MAX_ASSETS);
  window.localStorage.setItem(STORAGE_ASSETS, JSON.stringify(next));
}

export function readRecentComposerHashtags(): string[] {
  if (typeof window === 'undefined') return [];
  const v = safeJsonParse<string[]>(window.localStorage.getItem(STORAGE_HASHTAGS), []);
  return Array.isArray(v)
    ? v.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : [];
}

export function pushRecentComposerHashtag(tagRaw: string): void {
  if (typeof window === 'undefined') return;
  const tag = tagRaw.replace(/^#/, '').trim().toLowerCase();
  if (!tag) return;
  const prev = readRecentComposerHashtags().filter((t) => t !== tag);
  const next = [tag, ...prev].slice(0, MAX_HASHTAGS);
  window.localStorage.setItem(STORAGE_HASHTAGS, JSON.stringify(next));
}
