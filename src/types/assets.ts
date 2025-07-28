// Asset type definitions for distinct Gold and Bitcoin handling

export interface AssetDefinition {
  symbol: string;
  name: string;
  category: 'crypto' | 'commodities';
  displaySymbol: string;
  apiSymbol: string;
}

// Centralized asset registry to prevent symbol conflicts
export const ASSET_REGISTRY: Record<string, AssetDefinition> = {
  GOLD: {
    symbol: 'XAU/USD',
    name: 'Gold',
    category: 'commodities',
    displaySymbol: 'XAU/USD',
    apiSymbol: 'XAU/USD'
  },
  BITCOIN: {
    symbol: 'BTC/USD',
    name: 'Bitcoin', 
    category: 'crypto',
    displaySymbol: 'BTC/USD',
    apiSymbol: 'BTC/USD'
  }
} as const;

// Type-safe asset keys
export type AssetKey = keyof typeof ASSET_REGISTRY;

// Supported symbols for validation
export const SUPPORTED_ASSET_SYMBOLS = Object.values(ASSET_REGISTRY).map(asset => asset.symbol);

// Symbol validation function
export function validateAssetSymbol(symbol: string): AssetDefinition | null {
  const upperSymbol = symbol.toUpperCase();
  
  // Direct symbol match
  const assetBySymbol = Object.values(ASSET_REGISTRY).find(
    asset => asset.symbol === upperSymbol || asset.displaySymbol === upperSymbol
  );
  
  if (assetBySymbol) return assetBySymbol;
  
  // Alternative name matching
  if (upperSymbol === 'GOLD') return ASSET_REGISTRY.GOLD;
  if (upperSymbol === 'BITCOIN') return ASSET_REGISTRY.BITCOIN;
  
  return null;
}

// Get standardized symbol for API calls
export function getStandardSymbol(symbol: string): string | null {
  const asset = validateAssetSymbol(symbol);
  return asset ? asset.symbol : null;
}

// Check if symbol is supported
export function isSupportedSymbol(symbol: string): boolean {
  return validateAssetSymbol(symbol) !== null;
}