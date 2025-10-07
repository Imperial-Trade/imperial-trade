// Tradermade asset type definitions for 5 supported symbols

export interface AssetDefinition {
  symbol: string;
  name: string;
  category: 'crypto' | 'commodities' | 'forex' | 'indices';
  displaySymbol: string;
  tradermadeSymbol: string;
}

// Centralized asset registry for Tradermade symbols
// COST OPTIMIZATION: Only XAUUSD and BTCUSD are supported for live streaming
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