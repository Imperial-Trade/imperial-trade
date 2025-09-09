import React, { useEffect } from 'react';
import { cleanInvalidPriceCache } from '@/utils/priceGuards';
import { isDevToolsEnabled } from '@/utils/featureFlags';

/**
 * Smart cache cleaner component that only removes invalid/stale price data
 * Uses price guards to determine validity instead of blanket clearing
 * Also clears all cache on app startup to prevent cross-contamination
 */
export const CacheCleanerMount: React.FC = () => {
  useEffect(() => {
    if (isDevToolsEnabled()) {
      console.log('🧹 CacheCleanerMount: Starting cache management...');
    }
    
    // Defensive check for storage availability
    if (typeof Storage === 'undefined') {
      if (isDevToolsEnabled()) {
        console.warn('🧹 Storage not available, skipping cache cleaning');
      }
      return;
    }
    
    try {
      // Clear all price cache on first app startup to prevent cross-contamination
      const startupClearKey = 'priceCache_startup_cleared_v2';
      if (!sessionStorage.getItem(startupClearKey)) {
        if (isDevToolsEnabled()) {
          console.log('🧹 Startup: Clearing all price cache to prevent symbol contamination...');
        }
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('live_price_') || (key.includes('price') && key.includes('_timestamp'))) {
            localStorage.removeItem(key);
          }
        });
        sessionStorage.setItem(startupClearKey, 'true');
      }
      
      // Clean invalid cache entries on mount using price guards
      if (isDevToolsEnabled()) {
        console.log('🧹 Smart cache cleaning: validating price entries...');
      }
      cleanInvalidPriceCache();
      
      // Periodic cleanup every 15 minutes (increased frequency for better hygiene)
      const interval = setInterval(() => {
        if (isDevToolsEnabled()) {
          console.log('🧹 Periodic smart cache validation...');
        }
        try {
          cleanInvalidPriceCache();
        } catch (error) {
          if (isDevToolsEnabled()) {
            console.error('🧹 Error during periodic cache cleaning:', error);
          }
        }
      }, 15 * 60 * 1000);
      
      return () => {
        if (isDevToolsEnabled()) {
          console.log('🧹 CacheCleanerMount: Cleaning up interval');
        }
        clearInterval(interval);
      };
    } catch (error) {
      if (isDevToolsEnabled()) {
        console.error('🧹 Error initializing cache cleaner:', error);
      }
    }
  }, []);

  return null; // This component renders nothing
};

export default CacheCleanerMount;