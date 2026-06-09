// Symbol mapping utility for converting common symbols to TradingView tickers
export interface SymbolMap {
  [key: string]: {
    tradingViewSymbol: string;
    displayName: string;
    type: 'forex' | 'crypto' | 'stock' | 'commodity';
    exchange?: string;
  };
}

export const symbolMapper: SymbolMap = {
  // Major Indices
  'NAS100': { tradingViewSymbol: 'TVC:NDX', displayName: 'NASDAQ 100', type: 'stock', exchange: 'NASDAQ' },
  'SPX500': { tradingViewSymbol: 'TVC:SPX', displayName: 'S&P 500', type: 'stock', exchange: 'S&P' },
  'US30': { tradingViewSymbol: 'TVC:DJI', displayName: 'Dow Jones', type: 'stock', exchange: 'NYSE' },
  'UK100': { tradingViewSymbol: 'TVC:UKX', displayName: 'FTSE 100', type: 'stock', exchange: 'LSE' },
  'GER40': { tradingViewSymbol: 'TVC:DAX', displayName: 'DAX 40', type: 'stock', exchange: 'XETRA' },
  'JPN225': { tradingViewSymbol: 'TVC:NI225', displayName: 'Nikkei 225', type: 'stock', exchange: 'TSE' },
  'AUS200': { tradingViewSymbol: 'TVC:AS51', displayName: 'ASX 200', type: 'stock', exchange: 'ASX' },
  'HK50': { tradingViewSymbol: 'TVC:HSI', displayName: 'Hang Seng', type: 'stock', exchange: 'HKEX' },
  'FRA40': { tradingViewSymbol: 'TVC:CAC', displayName: 'CAC 40', type: 'stock', exchange: 'EPA' },
  'ESP35': { tradingViewSymbol: 'TVC:IBEX35', displayName: 'IBEX 35', type: 'stock', exchange: 'BME' },
  
  // Forex pairs - Full names
  'EURUSD': { tradingViewSymbol: 'FX:EURUSD', displayName: 'EUR/USD', type: 'forex' },
  'GBPUSD': { tradingViewSymbol: 'FX:GBPUSD', displayName: 'GBP/USD', type: 'forex' },
  'USDJPY': { tradingViewSymbol: 'FX:USDJPY', displayName: 'USD/JPY', type: 'forex' },
  'AUDUSD': { tradingViewSymbol: 'FX:AUDUSD', displayName: 'AUD/USD', type: 'forex' },
  'USDCAD': { tradingViewSymbol: 'FX:USDCAD', displayName: 'USD/CAD', type: 'forex' },
  'USDCHF': { tradingViewSymbol: 'FX:USDCHF', displayName: 'USD/CHF', type: 'forex' },
  'NZDUSD': { tradingViewSymbol: 'FX:NZDUSD', displayName: 'NZD/USD', type: 'forex' },
  'EURGBP': { tradingViewSymbol: 'FX:EURGBP', displayName: 'EUR/GBP', type: 'forex' },
  'EURJPY': { tradingViewSymbol: 'FX:EURJPY', displayName: 'EUR/JPY', type: 'forex' },
  'GBPJPY': { tradingViewSymbol: 'FX:GBPJPY', displayName: 'GBP/JPY', type: 'forex' },
  'EURCHF': { tradingViewSymbol: 'FX:EURCHF', displayName: 'EUR/CHF', type: 'forex' },
  'GBPCHF': { tradingViewSymbol: 'FX:GBPCHF', displayName: 'GBP/CHF', type: 'forex' },
  'AUDCHF': { tradingViewSymbol: 'FX:AUDCHF', displayName: 'AUD/CHF', type: 'forex' },
  'AUDCAD': { tradingViewSymbol: 'FX:AUDCAD', displayName: 'AUD/CAD', type: 'forex' },
  'AUDNZD': { tradingViewSymbol: 'FX:AUDNZD', displayName: 'AUD/NZD', type: 'forex' },
  'CADCHF': { tradingViewSymbol: 'FX:CADCHF', displayName: 'CAD/CHF', type: 'forex' },
  'CADJPY': { tradingViewSymbol: 'FX:CADJPY', displayName: 'CAD/JPY', type: 'forex' },
  'CHFJPY': { tradingViewSymbol: 'FX:CHFJPY', displayName: 'CHF/JPY', type: 'forex' },
  'NZDCAD': { tradingViewSymbol: 'FX:NZDCAD', displayName: 'NZD/CAD', type: 'forex' },
  'NZDCHF': { tradingViewSymbol: 'FX:NZDCHF', displayName: 'NZD/CHF', type: 'forex' },
  'NZDJPY': { tradingViewSymbol: 'FX:NZDJPY', displayName: 'NZD/JPY', type: 'forex' },
  
  // Forex pairs - Shortcuts
  'EU': { tradingViewSymbol: 'FX:EURUSD', displayName: 'EUR/USD', type: 'forex' },
  'GU': { tradingViewSymbol: 'FX:GBPUSD', displayName: 'GBP/USD', type: 'forex' },
  'UJ': { tradingViewSymbol: 'FX:USDJPY', displayName: 'USD/JPY', type: 'forex' },
  'AU': { tradingViewSymbol: 'FX:AUDUSD', displayName: 'AUD/USD', type: 'forex' },
  'UC': { tradingViewSymbol: 'FX:USDCAD', displayName: 'USD/CAD', type: 'forex' },
  'SWISSY': { tradingViewSymbol: 'FX:USDCHF', displayName: 'USD/CHF', type: 'forex' },
  'NU': { tradingViewSymbol: 'FX:NZDUSD', displayName: 'NZD/USD', type: 'forex' },
  'EG': { tradingViewSymbol: 'FX:EURGBP', displayName: 'EUR/GBP', type: 'forex' },
  'EJ': { tradingViewSymbol: 'FX:EURJPY', displayName: 'EUR/JPY', type: 'forex' },
  'GJ': { tradingViewSymbol: 'FX:GBPJPY', displayName: 'GBP/JPY', type: 'forex' },
  
  // Commodities - Full names
  'XAUUSD': { tradingViewSymbol: 'TVC:GOLD', displayName: 'Gold', type: 'commodity' },
  'XAGUSD': { tradingViewSymbol: 'TVC:SILVER', displayName: 'Silver', type: 'commodity' },
  'WTIUSD': { tradingViewSymbol: 'TVC:USOIL', displayName: 'Crude Oil WTI', type: 'commodity' },
  'UKOIL': { tradingViewSymbol: 'TVC:UKOIL', displayName: 'Brent Oil', type: 'commodity' },
  'XPTUSD': { tradingViewSymbol: 'TVC:PLATINUM', displayName: 'Platinum', type: 'commodity' },
  'XPDUSD': { tradingViewSymbol: 'TVC:PALLADIUM', displayName: 'Palladium', type: 'commodity' },
  'COPPER': { tradingViewSymbol: 'COMEX:HG1!', displayName: 'Copper', type: 'commodity' },
  'NATGAS': { tradingViewSymbol: 'NYMEX:NG1!', displayName: 'Natural Gas', type: 'commodity' },
  
  // Commodities - Shortcuts
  'GOLD': { tradingViewSymbol: 'TVC:GOLD', displayName: 'Gold', type: 'commodity' },
  'SILVER': { tradingViewSymbol: 'TVC:SILVER', displayName: 'Silver', type: 'commodity' },
  'OIL': { tradingViewSymbol: 'TVC:USOIL', displayName: 'Crude Oil WTI', type: 'commodity' },
  'BRENT': { tradingViewSymbol: 'TVC:UKOIL', displayName: 'Brent Oil', type: 'commodity' },
  'PLAT': { tradingViewSymbol: 'TVC:PLATINUM', displayName: 'Platinum', type: 'commodity' },
  'PALL': { tradingViewSymbol: 'TVC:PALLADIUM', displayName: 'Palladium', type: 'commodity' },
  
  // Major Cryptocurrencies - Full names
  'BTCUSDT': { tradingViewSymbol: 'BINANCE:BTCUSDT', displayName: 'Bitcoin', type: 'crypto', exchange: 'Binance' },
  'ETHUSDT': { tradingViewSymbol: 'BINANCE:ETHUSDT', displayName: 'Ethereum', type: 'crypto', exchange: 'Binance' },
  'BNBUSDT': { tradingViewSymbol: 'BINANCE:BNBUSDT', displayName: 'BNB', type: 'crypto', exchange: 'Binance' },
  'ADAUSDT': { tradingViewSymbol: 'BINANCE:ADAUSDT', displayName: 'Cardano', type: 'crypto', exchange: 'Binance' },
  'SOLUSDT': { tradingViewSymbol: 'BINANCE:SOLUSDT', displayName: 'Solana', type: 'crypto', exchange: 'Binance' },
  'XRPUSDT': { tradingViewSymbol: 'BINANCE:XRPUSDT', displayName: 'XRP', type: 'crypto', exchange: 'Binance' },
  'DOTUSDT': { tradingViewSymbol: 'BINANCE:DOTUSDT', displayName: 'Polkadot', type: 'crypto', exchange: 'Binance' },
  'AVAXUSDT': { tradingViewSymbol: 'BINANCE:AVAXUSDT', displayName: 'Avalanche', type: 'crypto', exchange: 'Binance' },
  'MATICUSDT': { tradingViewSymbol: 'BINANCE:MATICUSDT', displayName: 'Polygon', type: 'crypto', exchange: 'Binance' },
  'LINKUSDT': { tradingViewSymbol: 'BINANCE:LINKUSDT', displayName: 'Chainlink', type: 'crypto', exchange: 'Binance' },
  'LTCUSDT': { tradingViewSymbol: 'BINANCE:LTCUSDT', displayName: 'Litecoin', type: 'crypto', exchange: 'Binance' },
  'UNIUSDT': { tradingViewSymbol: 'BINANCE:UNIUSDT', displayName: 'Uniswap', type: 'crypto', exchange: 'Binance' },
  'ATOMUSDT': { tradingViewSymbol: 'BINANCE:ATOMUSDT', displayName: 'Cosmos', type: 'crypto', exchange: 'Binance' },
  'FILUSDT': { tradingViewSymbol: 'BINANCE:FILUSDT', displayName: 'Filecoin', type: 'crypto', exchange: 'Binance' },
  'TRXUSDT': { tradingViewSymbol: 'BINANCE:TRXUSDT', displayName: 'TRON', type: 'crypto', exchange: 'Binance' },
  'XLMUSDT': { tradingViewSymbol: 'BINANCE:XLMUSDT', displayName: 'Stellar', type: 'crypto', exchange: 'Binance' },
  'VETUSDT': { tradingViewSymbol: 'BINANCE:VETUSDT', displayName: 'VeChain', type: 'crypto', exchange: 'Binance' },
  'ICPUSDT': { tradingViewSymbol: 'BINANCE:ICPUSDT', displayName: 'Internet Computer', type: 'crypto', exchange: 'Binance' },
  'THETAUSDT': { tradingViewSymbol: 'BINANCE:THETAUSDT', displayName: 'Theta Network', type: 'crypto', exchange: 'Binance' },
  'ALGOUSDT': { tradingViewSymbol: 'BINANCE:ALGOUSDT', displayName: 'Algorand', type: 'crypto', exchange: 'Binance' },
  
  // Cryptocurrencies - Shortcuts
  'BTC': { tradingViewSymbol: 'BINANCE:BTCUSDT', displayName: 'Bitcoin', type: 'crypto', exchange: 'Binance' },
  'ETH': { tradingViewSymbol: 'BINANCE:ETHUSDT', displayName: 'Ethereum', type: 'crypto', exchange: 'Binance' },
  'BNB': { tradingViewSymbol: 'BINANCE:BNBUSDT', displayName: 'BNB', type: 'crypto', exchange: 'Binance' },
  'ADA': { tradingViewSymbol: 'BINANCE:ADAUSDT', displayName: 'Cardano', type: 'crypto', exchange: 'Binance' },
  'SOL': { tradingViewSymbol: 'BINANCE:SOLUSDT', displayName: 'Solana', type: 'crypto', exchange: 'Binance' },
  'XRP': { tradingViewSymbol: 'BINANCE:XRPUSDT', displayName: 'XRP', type: 'crypto', exchange: 'Binance' },
  'DOT': { tradingViewSymbol: 'BINANCE:DOTUSDT', displayName: 'Polkadot', type: 'crypto', exchange: 'Binance' },
  'AVAX': { tradingViewSymbol: 'BINANCE:AVAXUSDT', displayName: 'Avalanche', type: 'crypto', exchange: 'Binance' },
  'MATIC': { tradingViewSymbol: 'BINANCE:MATICUSDT', displayName: 'Polygon', type: 'crypto', exchange: 'Binance' },
  'LINK': { tradingViewSymbol: 'BINANCE:LINKUSDT', displayName: 'Chainlink', type: 'crypto', exchange: 'Binance' },
  'LTC': { tradingViewSymbol: 'BINANCE:LTCUSDT', displayName: 'Litecoin', type: 'crypto', exchange: 'Binance' },
  'UNI': { tradingViewSymbol: 'BINANCE:UNIUSDT', displayName: 'Uniswap', type: 'crypto', exchange: 'Binance' },
  'ATOM': { tradingViewSymbol: 'BINANCE:ATOMUSDT', displayName: 'Cosmos', type: 'crypto', exchange: 'Binance' },
  'FIL': { tradingViewSymbol: 'BINANCE:FILUSDT', displayName: 'Filecoin', type: 'crypto', exchange: 'Binance' },
  'TRX': { tradingViewSymbol: 'BINANCE:TRXUSDT', displayName: 'TRON', type: 'crypto', exchange: 'Binance' },
  'XLM': { tradingViewSymbol: 'BINANCE:XLMUSDT', displayName: 'Stellar', type: 'crypto', exchange: 'Binance' },
  'VET': { tradingViewSymbol: 'BINANCE:VETUSDT', displayName: 'VeChain', type: 'crypto', exchange: 'Binance' },
  'ICP': { tradingViewSymbol: 'BINANCE:ICPUSDT', displayName: 'Internet Computer', type: 'crypto', exchange: 'Binance' },
  'THETA': { tradingViewSymbol: 'BINANCE:THETAUSDT', displayName: 'Theta Network', type: 'crypto', exchange: 'Binance' },
  'ALGO': { tradingViewSymbol: 'BINANCE:ALGOUSDT', displayName: 'Algorand', type: 'crypto', exchange: 'Binance' },
  
  // Major US Stocks
  'AAPL': { tradingViewSymbol: 'NASDAQ:AAPL', displayName: 'Apple Inc.', type: 'stock', exchange: 'NASDAQ' },
  'GOOGL': { tradingViewSymbol: 'NASDAQ:GOOGL', displayName: 'Alphabet Inc.', type: 'stock', exchange: 'NASDAQ' },
  'MSFT': { tradingViewSymbol: 'NASDAQ:MSFT', displayName: 'Microsoft Corporation', type: 'stock', exchange: 'NASDAQ' },
  'AMZN': { tradingViewSymbol: 'NASDAQ:AMZN', displayName: 'Amazon.com Inc.', type: 'stock', exchange: 'NASDAQ' },
  'TSLA': { tradingViewSymbol: 'NASDAQ:TSLA', displayName: 'Tesla Inc.', type: 'stock', exchange: 'NASDAQ' },
  'NVDA': { tradingViewSymbol: 'NASDAQ:NVDA', displayName: 'NVIDIA Corporation', type: 'stock', exchange: 'NASDAQ' },
  'META': { tradingViewSymbol: 'NASDAQ:META', displayName: 'Meta Platforms Inc.', type: 'stock', exchange: 'NASDAQ' },
  'NFLX': { tradingViewSymbol: 'NASDAQ:NFLX', displayName: 'Netflix Inc.', type: 'stock', exchange: 'NASDAQ' },
  'GOOG': { tradingViewSymbol: 'NASDAQ:GOOG', displayName: 'Alphabet Inc. Class C', type: 'stock', exchange: 'NASDAQ' },
  'JPM': { tradingViewSymbol: 'NYSE:JPM', displayName: 'JPMorgan Chase & Co.', type: 'stock', exchange: 'NYSE' },
  'JNJ': { tradingViewSymbol: 'NYSE:JNJ', displayName: 'Johnson & Johnson', type: 'stock', exchange: 'NYSE' },
  'V': { tradingViewSymbol: 'NYSE:V', displayName: 'Visa Inc.', type: 'stock', exchange: 'NYSE' },
  'PG': { tradingViewSymbol: 'NYSE:PG', displayName: 'Procter & Gamble', type: 'stock', exchange: 'NYSE' },
  'UNH': { tradingViewSymbol: 'NYSE:UNH', displayName: 'UnitedHealth Group', type: 'stock', exchange: 'NYSE' },
  'HD': { tradingViewSymbol: 'NYSE:HD', displayName: 'Home Depot', type: 'stock', exchange: 'NYSE' },
  'MA': { tradingViewSymbol: 'NYSE:MA', displayName: 'Mastercard Inc.', type: 'stock', exchange: 'NYSE' },
  'BAC': { tradingViewSymbol: 'NYSE:BAC', displayName: 'Bank of America', type: 'stock', exchange: 'NYSE' },
  'DIS': { tradingViewSymbol: 'NYSE:DIS', displayName: 'Walt Disney Company', type: 'stock', exchange: 'NYSE' },
  'ADBE': { tradingViewSymbol: 'NASDAQ:ADBE', displayName: 'Adobe Inc.', type: 'stock', exchange: 'NASDAQ' },
  'CRM': { tradingViewSymbol: 'NYSE:CRM', displayName: 'Salesforce Inc.', type: 'stock', exchange: 'NYSE' },
  'KO': { tradingViewSymbol: 'NYSE:KO', displayName: 'Coca-Cola Company', type: 'stock', exchange: 'NYSE' },
  'PFE': { tradingViewSymbol: 'NYSE:PFE', displayName: 'Pfizer Inc.', type: 'stock', exchange: 'NYSE' },
  'VZ': { tradingViewSymbol: 'NYSE:VZ', displayName: 'Verizon Communications', type: 'stock', exchange: 'NYSE' },
  'INTC': { tradingViewSymbol: 'NASDAQ:INTC', displayName: 'Intel Corporation', type: 'stock', exchange: 'NASDAQ' },
  'CSCO': { tradingViewSymbol: 'NASDAQ:CSCO', displayName: 'Cisco Systems', type: 'stock', exchange: 'NASDAQ' },
  'XOM': { tradingViewSymbol: 'NYSE:XOM', displayName: 'Exxon Mobil Corporation', type: 'stock', exchange: 'NYSE' },
  'WMT': { tradingViewSymbol: 'NYSE:WMT', displayName: 'Walmart Inc.', type: 'stock', exchange: 'NYSE' },
  'ORCL': { tradingViewSymbol: 'NYSE:ORCL', displayName: 'Oracle Corporation', type: 'stock', exchange: 'NYSE' },
};

/**
 * Map alias tickers → one canonical label for asset search / composer lists (same instrument as {@link symbolMapper}).
 * Counts and rows for aliases merge into the canonical row.
 */
export const ASSET_LIST_CANONICAL: Record<string, string> = {
  GOLD: 'XAUUSD',
};

/** Canonical ticker for deduped asset pickers (e.g. `GOLD` → `XAUUSD`). */
export function getCanonicalAssetListLabel(symbol: string): string {
  const u = symbol.toUpperCase();
  return ASSET_LIST_CANONICAL[u] ?? u;
}

/** Sum feed frequencies for a canonical ticker including aliases (e.g. `GOLD` + `XAUUSD`). */
export function getCombinedSymbolFrequency(
  symbolCounts: Map<string, number>,
  canonicalUpper: string
): number {
  let n = symbolCounts.get(canonicalUpper) ?? 0;
  for (const [alias, canon] of Object.entries(ASSET_LIST_CANONICAL)) {
    if (canon === canonicalUpper) n += symbolCounts.get(alias.toUpperCase()) ?? 0;
  }
  return n;
}

export const getSymbolInfo = (symbol: string) => {
  const upperSymbol = symbol.toUpperCase();
  return symbolMapper[upperSymbol] || {
    tradingViewSymbol: `NASDAQ:${upperSymbol}`,
    displayName: upperSymbol,
    type: 'stock' as const,
    exchange: 'NASDAQ'
  };
};

export const isValidSymbol = (symbol: string): boolean => {
  return Boolean(symbolMapper[symbol.toUpperCase()]);
};

export const getSymbolsByType = (type: 'forex' | 'crypto' | 'stock' | 'commodity') => {
  return Object.entries(symbolMapper)
    .filter(([_, info]) => info.type === type)
    .map(([symbol, info]) => ({ symbol, ...info }));
};

export const isFinancialAsset = (symbol: string): boolean => {
  // Remove # or $ prefix and check if it's a valid financial symbol
  const cleanSymbol = symbol.replace(/^[#$]/, '').toUpperCase();
  return Boolean(symbolMapper[cleanSymbol]);
};

/**
 * Same route as feed `PostContent` hashtag chips and `CommentThreadRow` tag links:
 * known symbols → `/asset/:SYMBOL`, otherwise `/hashtag/:tag`.
 */
export function getOrderflowTagOrAssetPath(tagOrSymbol: string): string {
  const clean = tagOrSymbol.replace(/^[#$]/, '').trim();
  if (!clean) return '/';
  const asAsset = isFinancialAsset(`#${clean}`);
  return asAsset
    ? `/asset/${clean.toUpperCase()}`
    : `/hashtag/${clean.toLowerCase()}`;
}

/**
 * Chip label for feed / composer: known catalog symbols as `$SYMBOL`, else `#tag`
 * (matches {@link getOrderflowTagOrAssetPath} routing).
 */
export function formatOrderflowTagChipLabel(raw: string): string {
  const clean = raw.replace(/^[#$]/, '').trim();
  if (!clean) return '#';
  return isFinancialAsset(`#${clean}`)
    ? `$${clean.toUpperCase()}`
    : `#${clean.toLowerCase()}`;
}