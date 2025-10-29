/**
 * Pip calculation utilities for converting between price and pips
 */

export const getPipSize = (symbol: string): number => {
  const upperSymbol = symbol.toUpperCase();
  
  // Indices (points): 1.0 (e.g., US30, US100)
  if (
    upperSymbol.includes('US30') ||
    upperSymbol.includes('DJI') ||
    upperSymbol.includes('DOW') ||
    upperSymbol.includes('US100') ||
    upperSymbol.includes('NDX') ||
    upperSymbol.includes('NAS100')
  ) {
    return 1.0;
  }
  
  // Gold (XAU/USD): 1 pip = $0.10 (10 cents)
  if (upperSymbol.includes('XAU') || upperSymbol.includes('GOLD')) {
    return 0.1;
  }
  
  // Bitcoin (BTC/USD): define pip as $1.00
  if (upperSymbol.includes('BTC')) {
    return 1.0;
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
  
  // Default for others
  return 0.01;
};

export const calculatePipsFromPrice = (
  entryPrice: number, 
  targetPrice: number, 
  symbol: string
): number => {
  const pipSize = getPipSize(symbol);
  const priceDiff = targetPrice - entryPrice;
  return priceDiff / pipSize;
};

export const calculatePriceFromPips = (
  entryPrice: number, 
  pips: number, 
  symbol: string, 
  direction: 'up' | 'down'
): number => {
  const pipSize = getPipSize(symbol);
  const priceChange = pips * pipSize;
  
  if (direction === 'up') {
    return entryPrice + priceChange;
  } else {
    return entryPrice - priceChange;
  }
};

export const formatPips = (pips: number): string => {
  return pips.toFixed(1);
};

export const getDirectionFromTradeType = (
  tradeType: 'buy' | 'sell' | 'buy_limit' | 'sell_limit',
  targetType: 'stop_loss' | 'take_profit'
): 'up' | 'down' => {
  const isBuy = tradeType === 'buy' || tradeType === 'buy_limit';
  
  if (targetType === 'stop_loss') {
    return isBuy ? 'down' : 'up';
  } else {
    return isBuy ? 'up' : 'down';
  }
};