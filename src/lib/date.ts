/**
 * Date utilities for handling date-only operations without timezone issues
 * All trade_date values should be treated as date-only strings in YYYY-MM-DD format
 */

/**
 * Formats a Date object to YYYY-MM-DD string using local time
 */
export function formatYmdLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD string to a Date object in local time (noon to avoid DST issues)
 */
export function parseYmdToLocalDate(ymd: string): Date {
  const [year, month, day] = ymd.split('-').map(Number);
  // Set to noon local time to avoid DST boundary issues
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

/**
 * Validates if a string is in YYYY-MM-DD format
 */
export function isValidYmd(ymd: string): boolean {
  const ymdRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!ymdRegex.test(ymd)) return false;
  
  const date = parseYmdToLocalDate(ymd);
  return formatYmdLocal(date) === ymd;
}

/**
 * Checks if a YYYY-MM-DD date string represents a future date
 * Uses string comparison for efficiency and consistency
 */
export function isFutureYmd(dateStr: string): boolean {
  const todayKey = formatYmdLocal(new Date());
  return dateStr > todayKey;
}

/**
 * Gets the current date as YYYY-MM-DD string
 */
export function getTodayYmd(): string {
  return formatYmdLocal(new Date());
}

/**
 * Compares two YYYY-MM-DD date strings
 * Returns negative if a < b, positive if a > b, 0 if equal
 */
export function compareYmd(a: string, b: string): number {
  return a.localeCompare(b);
}