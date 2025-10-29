import { getPipSize, calculatePipsFromPrice, formatPips } from './pipCalculations';

export interface PipsData {
  value: number;
  formatted: string;
  direction: 'profit' | 'loss';
  percentage?: number;
}

export function calculatePipsForSignal(
  entryPrice: number,
  currentPrice: number,
  symbol: string,
  tradeType: 'buy' | 'sell' | 'buy_limit' | 'sell_limit'
): PipsData {
  const rawPips = calculatePipsFromPrice(entryPrice, currentPrice, symbol);
  const isBuy = tradeType === 'buy' || tradeType === 'buy_limit';
  
  let actualPips: number;
  let direction: 'profit' | 'loss';
  
  if (isBuy) {
    // BUY: positive pips = profit, negative pips = loss
    actualPips = rawPips;
    direction = rawPips >= 0 ? 'profit' : 'loss';
  } else {
    // SELL: flip the sign (negative raw pips = positive profit, positive raw pips = negative loss)
    actualPips = -rawPips;
    direction = actualPips >= 0 ? 'profit' : 'loss';
  }
  
  return {
    value: actualPips,
    formatted: `${direction === 'profit' ? '+' : '-'}${formatPips(Math.abs(actualPips))} PIPS`,
    direction,
    percentage: (actualPips / entryPrice) * 100
  };
}

export function calculateTPProgress(tpHits: number[], totalTPs: number): number {
  if (totalTPs === 0) return 0;
  return (tpHits.length / totalTPs) * 100;
}

export function formatPipsForNotification(
  pipsData: PipsData,
  includeDirection: boolean = true
): string {
  if (!includeDirection) {
    return `${formatPips(Math.abs(pipsData.value))} pips`;
  }
  return pipsData.formatted;
}
