/**
 * Time Utilities for Signal Display
 * CRITICAL FIX: Add time calculation utilities for "mins ago" display
 */

/**
 * Calculate time difference in a human-readable format
 */
export function getTimeAgo(date: Date | string): string {
  const now = new Date();
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  // For longer periods, show the actual date
  return targetDate.toLocaleDateString();
}

/**
 * Get minutes since a given date
 */
export function getMinutesSince(date: Date | string): number {
  const now = new Date();
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  return Math.floor((now.getTime() - targetDate.getTime()) / (1000 * 60));
}

/**
 * Format duration for signal display
 */
export function formatSignalDuration(createdAt: Date | string, closedAt?: Date | string): string {
  const startDate = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const endDate = closedAt 
    ? (typeof closedAt === 'string' ? new Date(closedAt) : closedAt)
    : new Date();

  const durationMs = endDate.getTime() - startDate.getTime();
  const durationMinutes = Math.floor(durationMs / (1000 * 60));

  if (durationMinutes < 60) {
    return `${durationMinutes}m`;
  }

  const durationHours = Math.floor(durationMinutes / 60);
  if (durationHours < 24) {
    const remainingMinutes = durationMinutes % 60;
    return remainingMinutes > 0 ? `${durationHours}h ${remainingMinutes}m` : `${durationHours}h`;
  }

  const durationDays = Math.floor(durationHours / 24);
  const remainingHours = durationHours % 24;
  return remainingHours > 0 ? `${durationDays}d ${remainingHours}h` : `${durationDays}d`;
}

/**
 * Check if a date is recent (within specified minutes)
 */
export function isRecent(date: Date | string, withinMinutes: number = 5): boolean {
  const minutesSince = getMinutesSince(date);
  return minutesSince <= withinMinutes;
}