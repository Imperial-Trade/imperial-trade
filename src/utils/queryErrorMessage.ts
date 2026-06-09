/**
 * Turns TanStack Query / Supabase `unknown` errors into a readable string.
 * Avoids `[object Object]` when the thrown value is a PostgREST-style object.
 */
export function queryErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (error && typeof error === "object") {
    const o = error as Record<string, unknown>;
    if (typeof o.message === "string" && o.message.trim()) return o.message;
    if (typeof o.error_description === "string" && o.error_description.trim())
      return o.error_description;
    if (typeof o.details === "string" && o.details.trim()) return o.details;
    if (typeof o.hint === "string" && o.hint.trim()) return o.hint;
    try {
      const s = JSON.stringify(o);
      if (s && s !== "{}") return s;
    } catch {
      /* ignore */
    }
  }
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}
