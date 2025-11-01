/**
 * Comprehensive Lot Sizing Mechanics for Trading Calculations
 * Based on industry-standard contract specifications
 */

export type AssetType = 'forex' | 'gold' | 'crypto' | 'index' | 'commodity';

export interface LotSizeCalculation {
  contractSize: number;
  pipValue: number;
  assetType: AssetType;
  baseUnit: string;
}

/**
 * Determine asset type from symbol
 */
export const getAssetType = (symbol: string): AssetType => {
  const upperSymbol = symbol.toUpperCase().replace('/', '');
  
  // Gold and precious metals
  if (upperSymbol.startsWith('XAU') || upperSymbol.startsWith('GOLD')) {
    return 'gold';
  }
  
  // Cryptocurrencies
  if (upperSymbol.includes('BTC') || upperSymbol.includes('ETH') || 
      upperSymbol.includes('USDT') || upperSymbol.includes('CRYPTO')) {
    return 'crypto';
  }
  
  // Indices
  if (['SPX500', 'US30', 'NAS100', 'UK100', 'DAX30', 'JP225'].some(index => 
      upperSymbol.includes(index))) {
    return 'index';
  }
  
  // Forex is default for currency pairs
  return 'forex';
};

/**
 * Get lot size specifications for an asset
 */
export const getLotSizeSpec = (symbol: string): LotSizeCalculation => {
  const assetType = getAssetType(symbol);
  const upperSymbol = symbol.toUpperCase().replace('/', '');
  
  switch (assetType) {
    case 'gold':
      return {
        contractSize: 100, // 100 troy ounces per standard lot
        pipValue: 1, // $1 per $1 price move per lot
        assetType: 'gold',
        baseUnit: 'troy ounces'
      };
      
    case 'crypto':
      return {
        contractSize: 1, // 1 unit per lot
        pipValue: 1, // Direct 1:1 price movement
        assetType: 'crypto',
        baseUnit: 'units'
      };
      
    case 'index':
      return {
        contractSize: 1, // Varies by broker, using 1 as default
        pipValue: 1,
        assetType: 'index',
        baseUnit: 'index points'
      };
      
    case 'forex':
    default:
      if (upperSymbol.includes('JPY')) {
        return {
          contractSize: 100000, // 100k base currency units
          pipValue: 0.01, // JPY pairs have different pip structure
          assetType: 'forex',
          baseUnit: 'currency units'
        };
      }
      return {
        contractSize: 100000, // 100k base currency units
        pipValue: 0.0001, // Standard pip for major pairs
        assetType: 'forex',
        baseUnit: 'currency units'
      };
  }
};

/**
 * Calculate P&L with proper lot sizing mechanics
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
        // JPY pairs: Convert to USD using exit price
        return (priceDiff * 100000 * lotSize) / exitPrice;
      }
      // Standard forex: Price difference × contract size × lots
      return priceDiff * 100000 * lotSize;
      
    case 'index':
    case 'commodity':
    default:
      // Index/Commodity: Direct price difference × lot size
      return priceDiff * lotSize;
  }
};

/**
 * Calculate position size based on risk amount
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
      if (symbol.toUpperCase().includes('JPY')) {
        // JPY pairs calculation
        return riskAmount / ((priceDiff * 100000) / entryPrice);
      }
      // Standard forex calculation
      return riskAmount / (priceDiff * 100000);
      
    case 'index':
    case 'commodity':
    default:
      // Direct calculation
      return riskAmount / priceDiff;
  }
};

/**
 * Calculate risk amount from position size
 */
export const calculateRiskAmount = (
  entryPrice: number,
  stopLoss: number,
  lotSize: number,
  symbol: string
): number => {
  const spec = getLotSizeSpec(symbol);
  const priceDiff = Math.abs(entryPrice - stopLoss);
  
  switch (spec.assetType) {
    case 'gold':
      return priceDiff * 100 * lotSize;
      
    case 'crypto':
      return priceDiff * lotSize;
      
    case 'forex':
      if (symbol.toUpperCase().includes('JPY')) {
        return (priceDiff * 100000 * lotSize) / entryPrice;
      }
      return priceDiff * 100000 * lotSize;
      
    case 'index':
    case 'commodity':
    default:
      return priceDiff * lotSize;
  }
};

/**
 * Get pip/point value for an asset
 */
export const getPipValue = (symbol: string, lotSize: number = 0.01): number => {
  const spec = getLotSizeSpec(symbol);
  
  switch (spec.assetType) {
    case 'gold':
      // $1 per $1 move for 0.01 lots (1 troy ounce)
      return 1 * lotSize * 100;
      
    case 'crypto':
      // $1 per $1 move
      return lotSize;
      
    case 'forex':
      if (symbol.toUpperCase().includes('JPY')) {
        // ~$0.66 per pip for 0.01 lots at current rates
        return (0.01 * 100000 * lotSize) / 151; // Approximate USD/JPY rate
      }
      // $1 per pip for 0.01 lots on major pairs
      return 0.0001 * 100000 * lotSize;
      
    default:
      return lotSize;
  }
};

/**
 * Format lot size display based on asset type
 */
export const formatLotSize = (lotSize: number, symbol: string): string => {
  const spec = getLotSizeSpec(symbol);
  
  switch (spec.assetType) {
    case 'gold':
      const ounces = lotSize * 100;
      return `${lotSize} lots (${ounces} oz)`;
      
    case 'crypto':
      return `${lotSize} ${symbol.split('/')[0] || 'units'}`;
      
    case 'forex':
      const units = lotSize * 100000;
      return `${lotSize} lots (${units.toLocaleString()} units)`;
      
    default:
      return `${lotSize} lots`;
  }
};

/**
 * Get suggested lot sizes for an asset type
 */
export const getSuggestedLotSizes = (symbol: string): number[] => {
  const assetType = getAssetType(symbol);
  
  switch (assetType) {
    case 'gold':
      return [0.01, 0.05, 0.1, 0.25, 0.5, 1.0];
      
    case 'crypto':
      return [0.001, 0.01, 0.1, 0.25, 0.5, 1.0];
      
    case 'forex':
      return [0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0];
      
    default:
      return [0.1, 0.5, 1.0, 2.0, 5.0, 10.0];
  }
};