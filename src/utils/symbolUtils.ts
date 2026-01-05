/**
 * Symbol normalization utility for consistent symbol handling across the platform
 */

/**
 * Normalizes a trading symbol by removing separators (non-alphanumeric) and converting to uppercase
 * @param symbol - The symbol to normalize (e.g., "XAU/USD", "XAU-USD", "xauusd", "U30USD")
 * @returns Normalized symbol (e.g., "XAUUSD", "U30USD")
 */
export const normalizeSymbol = (symbol: string): string => {
  // Remove only separators (/, -, _, spaces) but keep letters AND numbers
  return symbol?.replace(/[/\s\-_]/g, '').toUpperCase() || '';
};

/**
 * Checks if a symbol is in a valid format (only alphabetic characters)
 * @param symbol - The symbol to validate
 * @returns True if valid, false otherwise
 */
export const isValidSymbol = (symbol: string): boolean => {
  return /^[A-Za-z]+$/.test(symbol || '');
};