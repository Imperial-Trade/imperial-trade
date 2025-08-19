// TraderMade Business Plan - Expanded asset definitions for 50+ symbols

export interface AssetDefinition {
  symbol: string;
  name: string;
  category: 'crypto' | 'commodities' | 'forex' | 'indices';
  displaySymbol: string;
  tradermadeSymbol: string;
}

// Expanded asset registry leveraging TraderMade Business Plan
export const ASSET_REGISTRY: Record<string, AssetDefinition> = {
  // FOREX - Major Pairs
  EURUSD: {
    symbol: 'EURUSD',
    name: 'Euro/Dollar',
    category: 'forex',
    displaySymbol: 'EUR/USD',
    tradermadeSymbol: 'EURUSD'
  },
  GBPUSD: {
    symbol: 'GBPUSD',
    name: 'Pound/Dollar',
    category: 'forex',
    displaySymbol: 'GBP/USD',
    tradermadeSymbol: 'GBPUSD'
  },
  USDJPY: {
    symbol: 'USDJPY',
    name: 'Dollar/Yen',
    category: 'forex',
    displaySymbol: 'USD/JPY',
    tradermadeSymbol: 'USDJPY'
  },
  AUDUSD: {
    symbol: 'AUDUSD',
    name: 'Australian Dollar/USD',
    category: 'forex',
    displaySymbol: 'AUD/USD',
    tradermadeSymbol: 'AUDUSD'
  },
  USDCAD: {
    symbol: 'USDCAD',
    name: 'Dollar/Canadian Dollar',
    category: 'forex',
    displaySymbol: 'USD/CAD',
    tradermadeSymbol: 'USDCAD'
  },
  NZDUSD: {
    symbol: 'NZDUSD',
    name: 'New Zealand Dollar/USD',
    category: 'forex',
    displaySymbol: 'NZD/USD',
    tradermadeSymbol: 'NZDUSD'
  },
  USDCHF: {
    symbol: 'USDCHF',
    name: 'Dollar/Swiss Franc',
    category: 'forex',
    displaySymbol: 'USD/CHF',
    tradermadeSymbol: 'USDCHF'
  },
  EURGBP: {
    symbol: 'EURGBP',
    name: 'Euro/Pound',
    category: 'forex',
    displaySymbol: 'EUR/GBP',
    tradermadeSymbol: 'EURGBP'
  },

  // COMMODITIES
  GOLD: {
    symbol: 'XAUUSD',
    name: 'Gold',
    category: 'commodities',
    displaySymbol: 'XAU/USD',
    tradermadeSymbol: 'XAUUSD'
  },
  SILVER: {
    symbol: 'XAGUSD',
    name: 'Silver',
    category: 'commodities',
    displaySymbol: 'XAG/USD',
    tradermadeSymbol: 'XAGUSD'
  },
  OIL_WTI: {
    symbol: 'WTIUSD',
    name: 'WTI Crude Oil',
    category: 'commodities',
    displaySymbol: 'WTI/USD',
    tradermadeSymbol: 'WTIUSD'
  },
  OIL_BRENT: {
    symbol: 'BRENTUSD',
    name: 'Brent Oil',
    category: 'commodities',
    displaySymbol: 'BRENT/USD',
    tradermadeSymbol: 'BRENTUSD'
  },
  NATGAS: {
    symbol: 'NATGASUSD',
    name: 'Natural Gas',
    category: 'commodities',
    displaySymbol: 'NATGAS/USD',
    tradermadeSymbol: 'NATGASUSD'
  },

  // CRYPTO
  BITCOIN: {
    symbol: 'BTCUSD',
    name: 'Bitcoin', 
    category: 'crypto',
    displaySymbol: 'BTC/USD',
    tradermadeSymbol: 'BTCUSD'
  },
  ETHEREUM: {
    symbol: 'ETHUSD',
    name: 'Ethereum',
    category: 'crypto',
    displaySymbol: 'ETH/USD',
    tradermadeSymbol: 'ETHUSD'
  },
  LITECOIN: {
    symbol: 'LTCUSD',
    name: 'Litecoin',
    category: 'crypto',
    displaySymbol: 'LTC/USD',
    tradermadeSymbol: 'LTCUSD'
  },
  CARDANO: {
    symbol: 'ADAUSD',
    name: 'Cardano',
    category: 'crypto',
    displaySymbol: 'ADA/USD',
    tradermadeSymbol: 'ADAUSD'
  },

  // INDICES
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
  SPX500: {
    symbol: 'SPX500',
    name: 'S&P 500',
    category: 'indices',
    displaySymbol: 'SPX500',
    tradermadeSymbol: 'SPX500USD'
  },
  UK100: {
    symbol: 'UK100',
    name: 'FTSE 100',
    category: 'indices',
    displaySymbol: 'UK100',
    tradermadeSymbol: 'UK100USD'
  },
  GER40: {
    symbol: 'GER40',
    name: 'DAX 40',
    category: 'indices',
    displaySymbol: 'GER40',
    tradermadeSymbol: 'GER40USD'
  },
  FRA40: {
    symbol: 'FRA40',
    name: 'CAC 40',
    category: 'indices',
    displaySymbol: 'FRA40',
    tradermadeSymbol: 'FRA40USD'
  },
  JPN225: {
    symbol: 'JPN225',
    name: 'Nikkei 225',
    category: 'indices',
    displaySymbol: 'JPN225',
    tradermadeSymbol: 'JPN225USD'
  }
} as const;

// Type-safe asset keys
export type AssetKey = keyof typeof ASSET_REGISTRY;

// Supported symbols for validation
export const SUPPORTED_ASSET_SYMBOLS = Object.values(ASSET_REGISTRY).map(asset => asset.symbol);

// Enhanced symbol validation with expanded coverage
export function validateAssetSymbol(symbol: string): AssetDefinition | null {
  const upperSymbol = symbol.toUpperCase().trim();
  
  // Direct symbol match
  const assetBySymbol = Object.values(ASSET_REGISTRY).find(
    asset => asset.symbol === upperSymbol || asset.tradermadeSymbol === upperSymbol
  );
  
  if (assetBySymbol) return assetBySymbol;
  
  // Alternative name matching for popular symbols
  const alternativeMatches: Record<string, keyof typeof ASSET_REGISTRY> = {
    'GOLD': 'GOLD',
    'XAUUSD': 'GOLD',
    'XAU/USD': 'GOLD',
    'SILVER': 'SILVER',
    'XAGUSD': 'SILVER',
    'XAG/USD': 'SILVER',
    'BITCOIN': 'BITCOIN',
    'BTCUSD': 'BITCOIN',
    'BTC/USD': 'BITCOIN',
    'BTC': 'BITCOIN',
    'ETHEREUM': 'ETHEREUM',
    'ETHUSD': 'ETHEREUM',
    'ETH/USD': 'ETHEREUM',
    'ETH': 'ETHEREUM',
    'USA30': 'USA30',
    'US30': 'USA30',
    'DOW': 'USA30',
    'NAS100': 'NAS100',
    'NASDAQ': 'NAS100',
    'SPX500': 'SPX500',
    'SP500': 'SPX500',
    'S&P500': 'SPX500',
    'EURUSD': 'EURUSD',
    'EUR/USD': 'EURUSD',
    'GBPUSD': 'GBPUSD',
    'GBP/USD': 'GBPUSD',
    'USDJPY': 'USDJPY',
    'USD/JPY': 'USDJPY',
    'WTI': 'OIL_WTI',
    'CRUDE': 'OIL_WTI',
    'OIL': 'OIL_WTI',
    'BRENT': 'OIL_BRENT'
  };
  
  if (alternativeMatches[upperSymbol]) {
    return ASSET_REGISTRY[alternativeMatches[upperSymbol]];
  }
  
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