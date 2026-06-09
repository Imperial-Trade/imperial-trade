/**
 * Local search history (Facebook-style "Recent") — device-local only.
 * Key versioned for safe migration.
 */

const STORAGE_KEY = 'orderflow:searchHistory_v1';
export const MAX_SEARCH_HISTORY = 15;

export type SearchHistoryItemType = 'query' | 'profile' | 'hashtag' | 'symbol';

export type SearchHistoryItem = {
  id: string;
  type: SearchHistoryItemType;
  value: string;
  label?: string;
  avatarUrl?: string | null;
  ts: number;
};

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (raw == null || raw === '') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function isValidItem(x: unknown): x is SearchHistoryItem {
  if (x == null || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.type === 'string' &&
    ['query', 'profile', 'hashtag', 'symbol'].includes(o.type) &&
    typeof o.value === 'string' &&
    typeof o.ts === 'number'
  );
}

export function readSearchHistory(): SearchHistoryItem[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = safeJsonParse<unknown[]>(raw, []);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isValidItem);
}

export function pushSearchHistory(
  item: Omit<SearchHistoryItem, 'ts'>
): SearchHistoryItem[] {
  if (typeof window === 'undefined') return [];
  let history = readSearchHistory().filter((h) => h.id !== item.id);
  const next: SearchHistoryItem = { ...item, ts: Date.now() };
  history = [next, ...history].slice(0, MAX_SEARCH_HISTORY);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return history;
}

export function removeSearchHistoryItem(id: string): SearchHistoryItem[] {
  if (typeof window === 'undefined') return [];
  const history = readSearchHistory().filter((h) => h.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return history;
}

export function clearSearchHistory(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

/** Stable id helpers for dedupe */
export function searchHistoryIdForQuery(q: string): string {
  return `q:${q.trim().toLowerCase()}`;
}

export function searchHistoryIdForProfile(id: string): string {
  return `p:${id}`;
}

export function searchHistoryIdForHashtag(tag: string): string {
  return `h:${tag.replace(/^#/, '').trim().toLowerCase()}`;
}

export function searchHistoryIdForSymbol(sym: string): string {
  return `s:${sym.replace(/^\$/, '').trim().toUpperCase()}`;
}
