// Tradermade asset type definitions for 5 supported symbols

export interface AssetDefinition {
  symbol: string;
  name: string;
  category: 'crypto' | 'commodities' | 'forex' | 'indices';
  displaySymbol: string;
  tradermadeSymbol: string;
}

// Centralized asset registry for Tradermade symbols
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
  USA30: {
    symbol: 'USA30',
    name: 'Dow Jones',
    category: 'indices',
    displaySymbol: 'US30',
    tradermadeSymbol: 'USA30USD'
  },
  NAS100: {
    symbol: 'NAS100',
    name: 'Nasdaq 100',
    category: 'indices',
    displaySymbol: 'NAS100',
    tradermadeSymbol: 'NAS100USD'
  },
  EURUSD: {
    symbol: 'EURUSD',
    name: 'Euro/Dollar',
    category: 'forex',
    displaySymbol: 'EUR/USD',
    tradermadeSymbol: 'EURUSD'
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
  
  // Enhanced composite label handling - create compact form for matching
  const compact = upperSymbol.replace(/[^A-Z0-9]/g, ''); // Remove spaces, special chars
  
  // USA30/Dow Jones matching (handle "Dow Jones USA30", "US30", etc.)
  if (compact.includes('USA30') || compact.includes('US30') || compact.includes('DOWJONES')) {
    console.log(`🔄 Normalized composite label '${symbol}' → 'USA30'`);
    return ASSET_REGISTRY.USA30;
  }
  
  // NAS100/Nasdaq matching (handle "Nasdaq 100 NAS100", "NASDAQ100", etc.)
  if (compact.includes('NAS100') || compact.includes('NASDAQ100') || compact.includes('NASDAQ')) {
    console.log(`🔄 Normalized composite label '${symbol}' → 'NAS100'`);
    return ASSET_REGISTRY.NAS100;
  }
  
  // Legacy alternative name matching (kept for backwards compatibility)
  if (upperSymbol === 'GOLD' || upperSymbol === 'XAUUSD') return ASSET_REGISTRY.GOLD;
  if (upperSymbol === 'BITCOIN' || upperSymbol === 'BTCUSD') return ASSET_REGISTRY.BITCOIN;
  if (upperSymbol === 'EURUSD' || upperSymbol === 'EUR/USD') return ASSET_REGISTRY.EURUSD;
  
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