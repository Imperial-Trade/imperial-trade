const STORAGE_PREFIX = "insight_chat_last_visited:";

export function readInsightLastVisitedMap(userId: string): Record<string, string> {
  if (!userId) return {};
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

export function readInsightRoomLastVisited(
  userId: string,
  roomId: string,
): string | undefined {
  if (!userId || !roomId) return undefined;
  return readInsightLastVisitedMap(userId)[roomId];
}

export function markInsightRoomVisited(userId: string, roomId: string): void {
  if (!userId || !roomId) return;
  const map = readInsightLastVisitedMap(userId);
  map[roomId] = new Date().toISOString();
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(map));
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("insight-chat-last-visited", { detail: { userId, roomId } }),
      );
    }
  } catch {
    /* quota / private mode */
  }
}
