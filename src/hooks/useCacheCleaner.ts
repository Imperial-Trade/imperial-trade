import { useEffect } from 'react';
import { cleanInvalidPriceCache } from '@/utils/priceGuards';

/**
 * Smart cache cleaner hook that only removes invalid/stale price data
 * Uses price guards to determine validity instead of blanket clearing
 */
export function useCacheCleaner() {
  useEffect(() => {
    // Clean invalid cache entries on mount using price guards
    console.log('🧹 Smart cache cleaning: validating price entries...');
    cleanInvalidPriceCache();
    
    // Periodic cleanup every 10 minutes (reduced frequency since we're smarter)
    const interval = setInterval(() => {
      console.log('🧹 Periodic smart cache validation...');
      cleanInvalidPriceCache();
    }, 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);
}