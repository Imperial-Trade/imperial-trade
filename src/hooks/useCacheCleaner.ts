import { useEffect } from 'react';
import { cleanInvalidPriceCache } from '@/utils/priceGuards';

/**
 * Smart cache cleaner hook that only removes invalid/stale price data
 * Uses price guards to determine validity instead of blanket clearing
 * Also clears all cache on app startup to prevent cross-contamination
 */
export function useCacheCleaner() {
  useEffect(() => {
    // Clear all price cache on first app startup to prevent cross-contamination
    const startupClearKey = 'priceCache_startup_cleared_v2';
    if (!sessionStorage.getItem(startupClearKey)) {
      console.log('🧹 Startup: Clearing all price cache to prevent symbol contamination...');
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('live_price_') || (key.includes('price') && key.includes('_timestamp'))) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.setItem(startupClearKey, 'true');
    }
    
    // Clean invalid cache entries on mount using price guards
    console.log('🧹 Smart cache cleaning: validating price entries...');
    cleanInvalidPriceCache();
    
    // Periodic cleanup every 15 minutes (increased frequency for better hygiene)
    const interval = setInterval(() => {
      console.log('🧹 Periodic smart cache validation...');
      cleanInvalidPriceCache();
    }, 15 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);
}