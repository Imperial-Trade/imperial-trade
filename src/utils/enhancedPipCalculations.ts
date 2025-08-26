
/**
 * Enhanced pip calculation utilities for all asset classes
 */

export interface PipCalculationResult {
  pips: number;
  pipValue: number;
  formattedPips: string;
  direction: 'profit' | 'loss' | 'neutral';
  significance: 'major' | 'minor' | 'micro';
}

export const getEnhancedPipSize = (symbol: string): number => {
  const upperSymbol = symbol.toUpperCase();
  
  // Indices (points = pips): 1.0
  if (
    upperSymbol.includes('US30') ||
    upperSymbol.includes('DJI') ||
    upperSymbol.includes('DOW') ||
    upperSymbol.includes('US100') ||
    upperSymbol.includes('NDX') ||
    upperSymbol.includes('NAS100') ||
    upperSymbol.includes('SPX') ||
    upperSymbol.includes('SPY')
  ) {
    return 1.0;
  }
  
  // Gold (XAU/USD): 1 pip = $0.10
  if (upperSymbol.includes('XAU') || upperSymbol.includes('GOLD')) {
    return 0.1;
  }
  
  // Silver (XAG/USD): 1 pip = $0.001
  if (upperSymbol.includes('XAG') || upperSymbol.includes('SILVER')) {
    return 0.001;
  }
  
  // Oil (WTI/Brent): 1 pip = $0.01
  if (
    upperSymbol.includes('WTI') || 
    upperSymbol.includes('BRENT') || 
    upperSymbol.includes('OIL')
  ) {
    return 0.01;
  }
  
  // Bitcoin (BTC/USD): 1 pip = $1.00
  if (upperSymbol.includes('BTC')) {
    return 1.0;
  }
  
  // Ethereum (ETH/USD): 1 pip = $0.01
  if (upperSymbol.includes('ETH')) {
    return 0.01;
  }
  
  // JPY pairs have 2 decimal places (0.01 pip size)
  if (upperSymbol.includes('JPY')) {
    return 0.01;
  }
  
  // Most forex pairs have 4 decimal places (0.0001 pip size)
  if (
    upperSymbol.includes('/') || 
    upperSymbol.includes('USD') || 
    upperSymbol.includes('EUR') || 
    upperSymbol.includes('GBP') || 
    upperSymbol.includes('CHF') || 
    upperSymbol.includes('CAD') || 
    upperSymbol.includes('AUD') || 
    upperSymbol.includes('NZD')
  ) {
    return 0.0001;
  }
  
  // Default for unknown instruments
  return 0.01;
};

export const calculateEnhancedPips = (
  entryPrice: number,
  currentPrice: number,
  symbol: string,
  tradeType: 'buy' | 'sell' | 'buy_limit' | 'sell_limit'
): PipCalculationResult => {
  const pipSize = getEnhancedPipSize(symbol);
  const isBuy = tradeType.startsWith('buy');
  
  let priceDiff = currentPrice - entryPrice;
  if (!isBuy) priceDiff = -priceDiff; // Invert for sell trades
  
  const pips = priceDiff / pipSize;
  const absPips = Math.abs(pips);
  
  // Determine direction
  let direction: 'profit' | 'loss' | 'neutral' = 'neutral';
  if (pips > 0.1) direction = 'profit';
  else if (pips < -0.1) direction = 'loss';
  
  // Determine significance based on pip magnitude
  let significance: 'major' | 'minor' | 'micro' = 'micro';
  if (absPips >= 100) significance = 'major';
  else if (absPips >= 20) significance = 'minor';
  
  return {
    pips: Math.round(pips * 10) / 10, // Round to 1 decimal
    pipValue: pipSize,
    formattedPips: formatPips(pips),
    direction,
    significance
  };
};

export const calculateDistanceToEntry = (
  targetPrice: number,
  currentPrice: number,
  symbol: string
): PipCalculationResult => {
  const pipSize = getEnhancedPipSize(symbol);
  const distance = Math.abs(currentPrice - targetPrice) / pipSize;
  
  let significance: 'major' | 'minor' | 'micro' = 'micro';
  if (distance >= 100) significance = 'major';
  else if (distance >= 20) significance = 'minor';
  
  return {
    pips: Math.round(distance * 10) / 10,
    pipValue: pipSize,
    formattedPips: formatPips(distance),
    direction: 'neutral',
    significance
  };
};

export const formatPips = (pips: number): string => {
  const absPips = Math.abs(pips);
  const sign = pips >= 0 ? '+' : '-';
  
  if (absPips >= 1000) {
    return `${sign}${(absPips / 1000).toFixed(1)}K`;
  }
  
  return `${sign}${absPips.toFixed(1)}`;
};

export const getPipColor = (
  direction: 'profit' | 'loss' | 'neutral',
  significance: 'major' | 'minor' | 'micro'
): string => {
  if (direction === 'neutral') return 'text-muted-foreground';
  
  const baseColor = direction === 'profit' ? 'text-green' : 'text-red';
  const intensity = significance === 'major' ? '600' : significance === 'minor' ? '500' : '400';
  
  return `${baseColor}-${intensity}`;
};
