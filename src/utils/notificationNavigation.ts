/**
 * Resolve navigation target for room-scoped notifications (Pattern Stream / Insight chat).
 */
export function resolveRoomNotificationLink(metadata?: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  const linkUrl = metadata.link_url;
  if (typeof linkUrl === "string" && linkUrl.trim()) return linkUrl;
  const roomId = metadata.room_id;
  if (typeof roomId === "string" && roomId.trim()) {
    return `/dashboard/pattern-stream/room/${roomId}/chat?from=insight`;
  }
  return null;
}

export function resolveSignalStreamLink(metadata?: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  const signalId = metadata.signal_id;
  if (typeof signalId === "string" && signalId.trim()) {
    return `/dashboard/signal-stream?signal=${signalId}`;
  }
  return null;
}

/** Prefer room chat deep link when room_id is present; else fall back to signal stream. */
export function resolveNotificationNavigationTarget(
  metadata?: Record<string, unknown> | null,
): string | null {
  return resolveRoomNotificationLink(metadata) ?? resolveSignalStreamLink(metadata);
}
