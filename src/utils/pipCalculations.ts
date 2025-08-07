/**
 * Pip calculation utilities for converting between price and pips
 */

export const getPipSize = (symbol: string): number => {
  const upperSymbol = symbol.toUpperCase();
  
  // Gold: 1 pip = $0.10 (10 cents)
  if (upperSymbol.includes('XAU') || upperSymbol.includes('GOLD')) {
    return 0.10;
  }
  
  // JPY pairs have 2 decimal places (0.01 pip size)
  if (upperSymbol.includes('JPY')) {
    return 0.01;
  }
  
  // Most forex pairs have 4 decimal places (0.0001 pip size)
  if (upperSymbol.includes('/') || 
      upperSymbol.includes('USD') || 
      upperSymbol.includes('EUR') || 
      upperSymbol.includes('GBP') || 
      upperSymbol.includes('CHF') || 
      upperSymbol.includes('CAD') || 
      upperSymbol.includes('AUD') || 
      upperSymbol.includes('NZD')) {
    return 0.0001;
  }
  
  // Crypto and indices typically use 0.01
  return 0.01;
};

export const calculatePipsFromPrice = (
  entryPrice: number, 
  targetPrice: number, 
  symbol: string
): number => {
  const pipSize = getPipSize(symbol);
  const priceDiff = Math.abs(targetPrice - entryPrice);
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