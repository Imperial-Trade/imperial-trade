
import { useState, useCallback, useMemo } from 'react';
import { useOptimizedDebounce } from './useOptimizedDebounce';

// Static asset lists (moved outside to prevent recreation)
export const FOREX_PAIRS = [
  "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD", "NZD/USD",
  "EUR/GBP", "EUR/JPY", "EUR/CHF", "EUR/AUD", "EUR/CAD", "EUR/NZD",
  "GBP/JPY", "GBP/CHF", "GBP/AUD", "GBP/CAD", "GBP/NZD",
  "AUD/JPY", "AUD/CAD", "AUD/CHF", "AUD/NZD",
  "CAD/JPY", "CAD/CHF", "CHF/JPY", "NZD/JPY", "NZD/CHF", "NZD/CAD",
];

export const COMMODITIES = ["XAU/USD", "XAG/USD", "WTI/USD", "BRENT/USD"];
export const INDICES = ["SPX500", "US30", "NAS100", "UK100", "DAX30", "JP225"];

// Cache for API responses
const cryptoCache = new Map<string, { data: string[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface UseAssetSearchProps {
  query: string;
  delay?: number;
}

export const useAssetSearch = ({ query, delay = 300 }: UseAssetSearchProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useOptimizedDebounce(query, delay);
  
  // Get recent assets from localStorage
  const getRecentAssets = useCallback(() => {
    try {
      const stored = localStorage.getItem("recent-trading-assets");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // Save asset to recent list
  const saveRecentAsset = useCallback((asset: string) => {
    if (!asset.trim()) return;

    const recent = getRecentAssets();
    const normalized = asset.toUpperCase().trim();
    const filtered = recent.filter((item: string) => item !== normalized);
    const updated = [normalized, ...filtered].slice(0, 5);

    localStorage.setItem("recent-trading-assets", JSON.stringify(updated));
  }, [getRecentAssets]);

  // Fetch crypto suggestions with caching
  const fetchCryptoSuggestions = useCallback(async (searchQuery: string): Promise<string[]> => {
    const cacheKey = searchQuery.toLowerCase();
    const cached = cryptoCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    try {
      setIsLoading(true);
      const response = await fetch(
        `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(searchQuery)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        const suggestions = (data.coins || [])
          .slice(0, 5)
          .map((coin: any) => `${coin.symbol.toUpperCase()}/USDT`);
        
        cryptoCache.set(cacheKey, { data: suggestions, timestamp: Date.now() });
        return suggestions;
      }
    } catch (error) {
      console.warn("Could not fetch crypto suggestions:", error);
    } finally {
      setIsLoading(false);
    }
    
    return [];
  }, []);

  // Generate suggestions based on query
  const suggestions = useMemo(async () => {
    const normalizedQuery = debouncedQuery.toUpperCase().trim();
    
    if (!normalizedQuery) {
      return getRecentAssets();
    }

    // Filter local lists
    const forexSuggestions = FOREX_PAIRS.filter((pair) =>
      pair.includes(normalizedQuery)
    );
    const commoditySuggestions = COMMODITIES.filter((c) =>
      c.includes(normalizedQuery)
    );
    const indexSuggestions = INDICES.filter((i) => 
      i.includes(normalizedQuery)
    );

    // Get crypto suggestions
    const cryptoSuggestions = await fetchCryptoSuggestions(debouncedQuery);

    // Combine all sources
    const combined = [
      ...indexSuggestions,
      ...forexSuggestions,
      ...commoditySuggestions,
      ...cryptoSuggestions,
    ];

    return [...new Set(combined)].slice(0, 10);
  }, [debouncedQuery, getRecentAssets, fetchCryptoSuggestions]);

  return {
    suggestions,
    isLoading,
    saveRecentAsset,
    getRecentAssets,
  };
};
