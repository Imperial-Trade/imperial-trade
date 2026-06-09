/** Normalize forum_posts.image from DB (jsonb array, JSON string, or malformed). */
export function normalizePostImages(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((u): u is string => typeof u === "string" && u.length > 0);
  }
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return [];
    if (t.startsWith("[")) {
      try {
        const p = JSON.parse(t) as unknown;
        if (Array.isArray(p)) {
          return p.filter((u): u is string => typeof u === "string" && u.length > 0);
        }
      } catch {
        return [raw];
      }
    }
    return [raw];
  }
  return [];
}
