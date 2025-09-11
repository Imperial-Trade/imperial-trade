/**
 * Symbol normalization utility for consistent symbol handling across the platform
 */

/**
 * Normalizes a trading symbol by removing non-alphabetic characters and converting to uppercase
 * @param symbol - The symbol to normalize (e.g., "XAU/USD", "XAU-USD", "xauusd")
 * @returns Normalized symbol (e.g., "XAUUSD")
 */
export const normalizeSymbol = (symbol: string): string => {
  return symbol?.replace(/[^A-Za-z]/g, '').toUpperCase() || '';
};

/**
 * Checks if a symbol is in a valid format (only alphabetic characters)
 * @param symbol - The symbol to validate
 * @returns True if valid, false otherwise
 */
export const isValidSymbol = (symbol: string): boolean => {
  return /^[A-Za-z]+$/.test(symbol || '');
};