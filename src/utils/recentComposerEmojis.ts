const STORAGE_KEY = 'insight-recent-composer-emojis';
const MAX_RECENT = 40;

export function getRecentComposerEmojis(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e): e is string => typeof e === 'string').slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function pushRecentComposerEmoji(emoji: string): void {
  if (typeof window === 'undefined' || !emoji) return;
  try {
    const prev = getRecentComposerEmojis().filter((e) => e !== emoji);
    const next = [emoji, ...prev].slice(0, MAX_RECENT);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
}
