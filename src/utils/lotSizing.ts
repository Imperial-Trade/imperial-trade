
/**
 * Enhanced Lot Sizing Mechanics with Proper Pip Calculations
 * Based on industry-standard contract specifications
 */

export type AssetType = 'forex' | 'gold' | 'crypto' | 'index' | 'commodity';

export interface LotSizeCalculation {
  contractSize: number;
  pipValue: number;
  pipSize: number;
  assetType: AssetType;
  baseUnit: string;
}

/**
 * Determine asset type from symbol with enhanced detection
 */
export const getAssetType = (symbol: string): AssetType => {
  const upperSymbol = symbol.toUpperCase().replace('/', '');
  
  // Gold and precious metals
  if (upperSymbol.startsWith('XAU') || upperSymbol.includes('GOLD')) {
    return 'gold';
  }
  
  // Cryptocurrencies
  if (upperSymbol.includes('BTC') || upperSymbol.includes('ETH') || 
      upperSymbol.includes('USDT') || upperSymbol.includes('CRYPTO')) {
    return 'crypto';
  }
  
  // Indices
  if (['SPX500', 'US30', 'USA30', 'NAS100', 'UK100', 'DAX30', 'JP225'].some(index => 
      upperSymbol.includes(index))) {
    return 'index';
  }
  
  // Forex is default for currency pairs
  return 'forex';
};

/**
 * Enhanced lot size specifications with proper pip calculations
 */
export const getLotSizeSpec = (symbol: string): LotSizeCalculation => {
  const assetType = getAssetType(symbol);
  const upperSymbol = symbol.toUpperCase().replace('/', '');
  
  switch (assetType) {
    case 'gold':
      return {
        contractSize: 100, // 100 troy ounces per standard lot
        pipValue: 1, // $1 per 0.1 price move per standard lot
        pipSize: 0.1, // Gold pip is 0.1
        assetType: 'gold',
        baseUnit: 'troy ounces'
      };
      
    case 'crypto':
      return {
        contractSize: 1, // 1 unit per lot
        pipValue: 1, // $1 per $1 price move
        pipSize: 1, // Crypto uses points, not pips
        assetType: 'crypto',
        baseUnit: 'units'
      };
      
    case 'index':
      return {
        contractSize: 1, // 1 index point per lot
        pipValue: 1, // $1 per index point
        pipSize: 1, // Index points
        assetType: 'index',
        baseUnit: 'index points'
      };
      
    case 'forex':
    default:
      if (upperSymbol.includes('JPY')) {
        return {
          contractSize: 100000, // 100k base currency units
          pipValue: 10, // ~$10 per pip for 1 standard lot (approximate)
          pipSize: 0.01, // JPY pairs pip is 0.01
          assetType: 'forex',
          baseUnit: 'currency units'
        };
      }
      return {
        contractSize: 100000, // 100k base currency units
        pipValue: 10, // ~$10 per pip for 1 standard lot
        pipSize: 0.0001, // Standard pip for major pairs
        assetType: 'forex',
        baseUnit: 'currency units'
      };
  }
};

/**
 * Enhanced P&L calculation with proper pip mechanics
 */
export const calculatePnL = (
  entryPrice: number,
  exitPrice: number,
  lotSize: number,
  symbol: string
): number => {
  const spec = getLotSizeSpec(symbol);
  const priceDiff = exitPrice - entryPrice;
  
  switch (spec.assetType) {
    case 'gold':
      // Gold: Price per ounce × 100 ounces per lot × number of lots
      return priceDiff * 100 * lotSize;
      
    case 'crypto':
      // Crypto: Direct price difference × lot size
      return priceDiff * lotSize;
      
    case 'forex':
      if (symbol.toUpperCase().includes('JPY')) {
        // JPY pairs: (price difference / pip size) × pip value × lots
        const pips = priceDiff / spec.pipSize;
        return pips * (spec.pipValue * lotSize);
      }
      // Standard forex: (price difference / pip size) × pip value × lots
      const pips = priceDiff / spec.pipSize;
      return pips * (spec.pipValue * lotSize);
      
    case 'index':
    case 'commodity':
    default:
      // Index/Commodity: Direct price difference × lot size
      return priceDiff * lotSize;
  }
};

/**
 * Enhanced position size calculation based on risk amount
 */
export const calculatePositionSize = (
  riskAmount: number,
  entryPrice: number,
  stopLoss: number,
  symbol: string
): number => {
  const spec = getLotSizeSpec(symbol);
  const priceDiff = Math.abs(entryPrice - stopLoss);
  
  if (priceDiff === 0) return 0;
  
  switch (spec.assetType) {
    case 'gold':
      // Risk amount ÷ (price difference × 100 ounces)
      return riskAmount / (priceDiff * 100);
      
    case 'crypto':
      // Risk amount ÷ price difference
      return riskAmount / priceDiff;
      
    case 'forex':
      // Calculate pips at risk
      const pipsAtRisk = priceDiff / spec.pipSize;
      if (symbol.toUpperCase().includes('JPY')) {
        // For JPY pairs, use approximate pip value
        return riskAmount / (pipsAtRisk * spec.pipValue);
      }
      // Standard forex calculation
      return riskAmount / (pipsAtRisk * spec.pipValue);
      
    case 'index':
    case 'commodity':
    default:
      // Direct calculation
      return riskAmount / priceDiff;
  }
};

/**
 * Enhanced risk amount calculation
 */
export const calculateRiskAmount = (
  entryPrice: number,
  stopLoss: number,
  lotSize: number,
  symbol: string
): number => {
  return Math.abs(calculatePnL(entryPrice, stopLoss, lotSize, symbol));
};

/**
 * Calculate pip value for a specific lot size
 */
export const getPipValue = (symbol: string, lotSize: number = 0.01): number => {
  const spec = getLotSizeSpec(symbol);
  
  switch (spec.assetType) {
    case 'gold':
      // $1 per 0.1 move for 0.01 lots
      return spec.pipValue * lotSize;
      
    case 'crypto':
      // Direct calculation for crypto
      return lotSize;
      
    case 'forex':
      // Pip value scales with lot size
      return spec.pipValue * lotSize;
      
    default:
      return spec.pipValue * lotSize;
  }
};

/**
 * Calculate pips between two prices
 */
export const calculatePips = (price1: number, price2: number, symbol: string): number => {
  const spec = getLotSizeSpec(symbol);
  const priceDiff = Math.abs(price2 - price1);
  return priceDiff / spec.pipSize;
};

/**
 * Enhanced lot size formatting
 */
export const formatLotSize = (lotSize: number, symbol: string): string => {
  const spec = getLotSizeSpec(symbol);
  
  switch (spec.assetType) {
    case 'gold':
      const ounces = lotSize * 100;
      return `${lotSize.toFixed(2)} lots (${ounces.toFixed(1)} oz)`;
      
    case 'crypto':
      const baseSymbol = symbol.split('/')[0] || 'units';
      return `${lotSize.toFixed(3)} ${baseSymbol}`;
      
    case 'forex':
      const units = lotSize * 100000;
      if (units >= 1000000) {
        return `${lotSize.toFixed(2)} lots (${(units/1000000).toFixed(1)}M units)`;
      }
      return `${lotSize.toFixed(2)} lots (${(units/1000).toFixed(0)}k units)`;
      
    default:
      return `${lotSize.toFixed(2)} lots`;
  }
};

/**
 * Enhanced suggested lot sizes
 */
export const getSuggestedLotSizes = (symbol: string): number[] => {
  const assetType = getAssetType(symbol);
  
  switch (assetType) {
    case 'gold':
      return [0.01, 0.02, 0.05, 0.1, 0.2, 0.5];
      
    case 'crypto':
      return [0.001, 0.01, 0.05, 0.1, 0.25, 0.5];
      
    case 'forex':
      return [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1.0];
      
    default:
      return [0.1, 0.2, 0.5, 1.0, 2.0, 5.0];
  }
};

/**
 * Format pip display based on asset type
 */
export const formatPips = (pips: number, symbol: string): string => {
  const spec = getLotSizeSpec(symbol);
  
  if (spec.assetType === 'crypto') {
    return `${pips.toFixed(0)} pts`;
  }
  
  if (Math.abs(pips) >= 1000) {
    return `${(pips/1000).toFixed(1)}k pips`;
  }
  
  return `${pips.toFixed(1)} pips`;
};
