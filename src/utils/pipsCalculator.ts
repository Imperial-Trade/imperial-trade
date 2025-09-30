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
  const pips = calculatePipsFromPrice(entryPrice, currentPrice, symbol);
  const isBuy = tradeType === 'buy' || tradeType === 'buy_limit';
  
  let actualPips = pips;
  let direction: 'profit' | 'loss' = 'profit';
  
  // Determine profit/loss based on trade direction
  if (isBuy) {
    if (currentPrice >= entryPrice) {
      direction = 'profit';
      actualPips = pips;
    } else {
      direction = 'loss';
      actualPips = pips;
    }
  } else {
    if (currentPrice <= entryPrice) {
      direction = 'profit';
      actualPips = pips;
    } else {
      direction = 'loss';
      actualPips = pips;
    }
  }
  
  return {
    value: actualPips,
    formatted: `${direction === 'profit' ? '+' : '-'}${formatPips(Math.abs(actualPips))} pips`,
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
