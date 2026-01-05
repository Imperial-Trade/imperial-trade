// Tradermade asset type definitions for 5 supported symbols

export interface AssetDefinition {
  symbol: string;
  name: string;
  category: 'crypto' | 'commodities' | 'forex' | 'indices';
  displaySymbol: string;
  tradermadeSymbol: string;
}

// Centralized asset registry for Tradermade symbols
// Live streaming supported for XAUUSD, BTCUSD, U30USD, SPXUSD, NDXUSD
export const ASSET_REGISTRY: Record<string, AssetDefinition> = {
  GOLD: {
    symbol: 'XAUUSD',
    name: 'Gold',
    category: 'commodities',
    displaySymbol: 'XAU/USD',
    tradermadeSymbol: 'XAUUSD'
  },
  BITCOIN: {
    symbol: 'BTCUSD',
    name: 'Bitcoin', 
    category: 'crypto',
    displaySymbol: 'BTC/USD',
    tradermadeSymbol: 'BTCUSD'
  },
  US30: {
    symbol: 'U30USD',
    name: 'US 30',
    category: 'indices',
    displaySymbol: 'US30/USD',
    tradermadeSymbol: 'U30USD'
  },
  SPX500: {
    symbol: 'SPXUSD',
    name: 'S&P 500',
    category: 'indices',
    displaySymbol: 'SPX/USD',
    tradermadeSymbol: 'SPXUSD'
  },
  NAS100: {
    symbol: 'NDXUSD',
    name: 'NASDAQ 100',
    category: 'indices',
    displaySymbol: 'NDX/USD',
    tradermadeSymbol: 'NDXUSD'
  }
} as const;

// Type-safe asset keys
export type AssetKey = keyof typeof ASSET_REGISTRY;

// Supported symbols for validation
export const SUPPORTED_ASSET_SYMBOLS = Object.values(ASSET_REGISTRY).map(asset => asset.symbol);

// Symbol validation function with enhanced composite label handling
export function validateAssetSymbol(symbol: string): AssetDefinition | null {
  const upperSymbol = symbol.toUpperCase().trim();
  
  // Direct symbol match first (fastest path)
  const assetBySymbol = Object.values(ASSET_REGISTRY).find(
    asset => asset.symbol === upperSymbol || asset.tradermadeSymbol === upperSymbol
  );
  
  if (assetBySymbol) return assetBySymbol;
  
  // Legacy alternative name matching (kept for backwards compatibility)
  if (upperSymbol === 'GOLD' || upperSymbol === 'XAUUSD') return ASSET_REGISTRY.GOLD;
  if (upperSymbol === 'BITCOIN' || upperSymbol === 'BTCUSD' || upperSymbol === 'BTC') return ASSET_REGISTRY.BITCOIN;
  if (upperSymbol === 'US30' || upperSymbol === 'U30USD' || upperSymbol === 'DOW') return ASSET_REGISTRY.US30;
  if (upperSymbol === 'SPX' || upperSymbol === 'SPXUSD' || upperSymbol === 'SPX500' || upperSymbol === 'S&P500') return ASSET_REGISTRY.SPX500;
  if (upperSymbol === 'NDX' || upperSymbol === 'NDXUSD' || upperSymbol === 'NAS100' || upperSymbol === 'NASDAQ100') return ASSET_REGISTRY.NAS100;
  
  return null;
}

// Get standardized symbol for API calls
export function getStandardSymbol(symbol: string): string | null {
  const asset = validateAssetSymbol(symbol);
  return asset ? asset.tradermadeSymbol : null;
}

// Check if symbol is supported
export function isSupportedSymbol(symbol: string): boolean {
  return validateAssetSymbol(symbol) !== null;
}

// Get assets by category
export function getAssetsByCategory(category: AssetDefinition['category']): AssetDefinition[] {
  return Object.values(ASSET_REGISTRY).filter(asset => asset.category === category);
}