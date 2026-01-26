export type TradeDurationCategory = 'Scalping' | 'Day Trade' | 'Swing Trade' | 'Position Trade';
export type TradeStyle = TradeDurationCategory;

export interface TradeDurationInfo {
  category: TradeDurationCategory;
  durationMinutes: number;
}

/**
 * Classifies a trade based on its duration
 * - Scalping: < 5 minutes
 * - Day Trade: 5 minutes - 1 day
 * - Swing Trade: 1 day - 1 week
 * - Position Trade: > 1 week
 */
export function classifyTradeDuration(
  openTime: Date,
  closeTime: Date
): TradeDurationInfo {
  const durationMs = closeTime.getTime() - openTime.getTime();
  const durationMinutes = Math.floor(durationMs / (1000 * 60));
  const durationHours = durationMinutes / 60;
  const durationDays = durationHours / 24;

  let category: TradeDurationCategory;

  if (durationMinutes < 5) {
    category = 'Scalping';
  } else if (durationDays < 1) {
    category = 'Day Trade';
  } else if (durationDays < 7) {
    category = 'Swing Trade';
  } else {
    category = 'Position Trade';
  }

  return {
    category,
    durationMinutes,
  };
}


