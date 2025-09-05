import { useEffect } from 'react';

/**
 * Cache cleaner hook to ensure fresh price data
 * Clears localStorage prices that might be cross-contaminated
 */
export function useCacheCleaner() {
  useEffect(() => {
    const clearPriceCache = () => {
      try {
        const keys = Object.keys(localStorage);
        const priceKeys = keys.filter(key => key.startsWith('lastPrice:'));
        
        if (priceKeys.length > 0) {
          console.log('🧹 Clearing stale price cache:', priceKeys);
          priceKeys.forEach(key => localStorage.removeItem(key));
        }
      } catch (e) {
        console.warn('Failed to clear price cache:', e);
      }
    };

    // Clear on mount to ensure fresh session
    clearPriceCache();
    
    // Optional: Clear every 5 minutes to prevent stale data accumulation
    const interval = setInterval(clearPriceCache, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);
}