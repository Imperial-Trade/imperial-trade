/**
 * Price validation guards to prevent cross-contamination between assets
 * Each asset has realistic price ranges to detect implausible data
 */

interface PriceRange {
  min: number;
  max: number;
  name: string;
}

// Realistic price ranges for each asset (updated January 2025)
const ASSET_PRICE_RANGES: Record<string, PriceRange> = {
  'XAUUSD': { min: 1800, max: 3000, name: 'Gold' },
  'GOLD': { min: 1800, max: 3000, name: 'Gold' },
  'XAU': { min: 1800, max: 3000, name: 'Gold' },
  'BTCUSD': { min: 10000, max: 200000, name: 'Bitcoin' },
  'BTC': { min: 10000, max: 200000, name: 'Bitcoin' },
  'BITCOIN': { min: 10000, max: 200000, name: 'Bitcoin' },
  'EURUSD': { min: 0.8, max: 1.4, name: 'EUR/USD' },
  'GBPUSD': { min: 1.0, max: 1.8, name: 'GBP/USD' },
  'USDJPY': { min: 100, max: 180, name: 'USD/JPY' },
  'AUDUSD': { min: 0.5, max: 1.2, name: 'AUD/USD' },
  'USDCAD': { min: 1.0, max: 1.8, name: 'USD/CAD' },
  'NZDUSD': { min: 0.4, max: 1.0, name: 'NZD/USD' },
  'USDCHF': { min: 0.7, max: 1.3, name: 'USD/CHF' },
  'CRUDE': { min: 30, max: 200, name: 'Crude Oil' },
  'WTI': { min: 30, max: 200, name: 'WTI Oil' },
  'BRENT': { min: 30, max: 200, name: 'Brent Oil' },
  'SILVER': { min: 15, max: 50, name: 'Silver' },
  'XAGUSD': { min: 15, max: 50, name: 'Silver' },
  'SPX500': { min: 2000, max: 8000, name: 'S&P 500' },
  'US500': { min: 2000, max: 8000, name: 'S&P 500' },
  'NAS100': { min: 8000, max: 25000, name: 'NASDAQ' },
  'DJ30': { min: 20000, max: 50000, name: 'Dow Jones' }
};

/**
 * Check if a price is plausible for the given symbol
 * @param price The price to validate
 * @param symbol The trading symbol
 * @returns true if price is within expected range for the symbol
 */
export function isPricePlausibleForSymbol(price: number, symbol: string): boolean {
  if (!price || price <= 0) {
    return false;
  }

  const normalizedSymbol = symbol.toUpperCase().trim();
  const range = ASSET_PRICE_RANGES[normalizedSymbol];
  
  // Enhanced cross-contamination detection
  if (!range) {
    console.warn(`⚠️ No price range defined for symbol: ${normalizedSymbol}`);
    return true; // Allow unknown symbols but warn
  }
  
  const isPlausible = price >= range.min && price <= range.max;
  
  // Log implausible prices for debugging
  if (!isPlausible) {
    console.error(`❌ Implausible price detected: ${normalizedSymbol} = ${price} (expected: ${range.min}-${range.max})`);
    
    // Special case: detect Gold/Bitcoin cross-contamination
    if (normalizedSymbol.includes('XAU') && price > 10000) {
      console.error(`🚨 CRITICAL: Gold showing Bitcoin-range price! ${price}`);
    }
    if (normalizedSymbol.includes('BTC') && price < 10000) {
      console.error(`🚨 CRITICAL: Bitcoin showing Gold-range price! ${price}`);
    }
  }
  
  return isPlausible;
}

/**
 * Get the expected price range for a symbol
 * @param symbol The trading symbol
 * @returns Price range info or null if not defined
 */
export function getPriceRangeForSymbol(symbol: string): PriceRange | null {
  const normalizedSymbol = symbol.toUpperCase().trim();
  return ASSET_PRICE_RANGES[normalizedSymbol] || null;
}

/**
 * Validate and clean cached price data
 * @param symbol The symbol to validate against
 * @param cachedData Object containing price and timestamp
 * @returns true if cached data is valid and plausible
 */
export function isCachedPriceValid(symbol: string, cachedData: { price: number; timestamp: number }): boolean {
  // Check timestamp age (max 48 hours for closed markets, 5 minutes for open markets)
  const now = Date.now();
  const ageMs = now - cachedData.timestamp;
  const ageMinutes = ageMs / (1000 * 60);
  
  // Market-aware TTL
  const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
  const maxAgeMinutes = isWeekend ? 48 * 60 : 5; // 48 hours on weekends, 5 minutes during week
  
  if (ageMinutes > maxAgeMinutes) {
    console.log(`📅 Cache expired for ${symbol}: ${Math.round(ageMinutes)} minutes old (max: ${maxAgeMinutes})`);
    return false;
  }

  // Check price plausibility
  if (!isPricePlausibleForSymbol(cachedData.price, symbol)) {
    console.log(`🚫 Cache invalid for ${symbol}: price ${cachedData.price} not plausible`);
    return false;
  }

  return true;
}

/**
 * Clean invalid price entries from localStorage
 * @param symbols Array of symbols to validate, or null to check all
 */
export function cleanInvalidPriceCache(symbols?: string[]): void {
  try {
    const keys = Object.keys(localStorage);
    const priceKeys = keys.filter(key => key.startsWith('lastPrice:') || key.startsWith('zero_pause_'));
    
    const keysToRemove: string[] = [];
    
    for (const key of priceKeys) {
      try {
        const stored = localStorage.getItem(key);
        if (!stored) continue;
        
        const data = JSON.parse(stored);
        const symbol = key.replace('lastPrice:', '').replace('zero_pause_', '');
        
        // If symbols array provided, only check those symbols
        if (symbols && !symbols.includes(symbol)) {
          continue;
        }
        
        if (!isCachedPriceValid(symbol, { price: data.price, timestamp: new Date(data.timestamp).getTime() })) {
          keysToRemove.push(key);
        }
      } catch (e) {
        // Malformed data, remove it
        keysToRemove.push(key);
      }
    }
    
    if (keysToRemove.length > 0) {
      console.log(`🧹 Cleaning ${keysToRemove.length} invalid cache entries:`, keysToRemove);
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
  } catch (e) {
    console.warn('Failed to clean invalid price cache:', e);
  }
}