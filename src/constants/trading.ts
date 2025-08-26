export const TRADE_TYPES = ['Long', 'Short'] as const;
export type TradeType = typeof TRADE_TYPES[number];

export function coerceTradeType(v: unknown): TradeType {
  const s = String(v ?? '').toLowerCase();
  return s === 'short' ? 'Short' : 'Long';
}