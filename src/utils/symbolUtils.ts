/**
 * Symbol normalization utility for consistent symbol handling across the platform
 */

import { getStandardSymbol } from '@/types/assets';

/**
 * Normalizes a trading symbol by removing separators (non-alphanumeric) and converting to uppercase
 * @param symbol - The symbol to normalize (e.g., "XAU/USD", "XAU-USD", "xauusd", "U30USD", "US30", "SPX", "NAS100")
 * @returns Normalized symbol (e.g., "XAUUSD", "U30USD", "SPXUSD", "NDXUSD")
 */
export const normalizeSymbol = (symbol: string): string => {
  if (!symbol || typeof symbol !== 'string') return '';
  
  // First try to get standard symbol from asset registry (handles US30 -> U30USD, SPX -> SPXUSD, NAS100 -> NDXUSD)
  const standardSymbol = getStandardSymbol(symbol);
  if (standardSymbol) {
    return standardSymbol;
  }
  
  // If not found in registry, remove separators and uppercase (fallback)
  return symbol.replace(/[/\s\-_]/g, '').toUpperCase() || '';
};

/**
 * Checks if a symbol is in a valid format (only alphabetic characters)
 * @param symbol - The symbol to validate
 * @returns True if valid, false otherwise
 */
export const isValidSymbol = (symbol: string): boolean => {
  return /^[A-Za-z]+$/.test(symbol || '');
};
