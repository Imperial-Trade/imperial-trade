/**
 * 🛡️ SAFE CACHE MANAGER
 * 
 * This utility manages browser cache and ensures that:
 * ✅ Notifications are NEVER cleared
 * ✅ Recent Activity persists across updates
 * ✅ App updates smoothly without breaking user data
 */

// ============================================
// PROTECTED KEYS - NEVER CLEARED
// ============================================
const PROTECTED_KEYS = [
  'imperial-trade-notifications',    // Recent Activity - MUST persist
  'push-notification-subscription',  // Push subscription state
  'onesignal-player-id',            // OneSignal player ID
  'imperial-user-preferences',       // User settings
];

// ============================================
// APP VERSION MANAGEMENT
// ============================================
const CURRENT_VERSION = '2.1.0'; // Update this when deploying new features
const VERSION_KEY = 'imperial-app-version';

/**
 * Check if app version has changed
 */
export const hasVersionChanged = (): boolean => {
  const storedVersion = localStorage.getItem(VERSION_KEY);
  return storedVersion !== CURRENT_VERSION;
};

/**
 * Update stored app version
 */
export const updateAppVersion = (): void => {
  localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
  console.log(`✅ App version updated to: ${CURRENT_VERSION}`);
};

/**
 * Get current app version
 */
export const getCurrentVersion = (): string => {
  return CURRENT_VERSION;
};

/**
 * Get stored app version
 */
export const getStoredVersion = (): string | null => {
  return localStorage.getItem(VERSION_KEY);
};

// ============================================
// SAFE CACHE CLEARING
// ============================================

/**
 * Clear ALL cache EXCEPT protected keys (notifications, preferences)
 * This is safe to run on app updates
 */
export const clearCacheSafely = (): void => {
  console.log('🧹 [Cache Manager] Starting SAFE cache clear...');
  console.log('🔒 [Cache Manager] Protected keys:', PROTECTED_KEYS);

  let clearedCount = 0;
  let protectedCount = 0;

  // Get all localStorage keys
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    
    if (key) {
      // Check if this key is protected
      const isProtected = PROTECTED_KEYS.some(protectedKey => 
        key === protectedKey || key.includes(protectedKey)
      );

      if (isProtected) {
        protectedCount++;
        console.log(`🔒 [PROTECTED] Keeping: ${key}`);
      } else {
        keysToRemove.push(key);
      }
    }
  }

  // Remove non-protected keys
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    clearedCount++;
    console.log(`🧹 [REMOVED] ${key}`);
  });

  console.log(`✅ [Cache Manager] Cache cleared safely:`, {
    cleared: clearedCount,
    protected: protectedCount,
    total: clearedCount + protectedCount
  });
};

/**
 * Clear sessionStorage (safe - doesn't contain notifications)
 */
export const clearSessionStorage = (): void => {
  console.log('🧹 [Cache Manager] Clearing sessionStorage...');
  const count = sessionStorage.length;
  sessionStorage.clear();
  console.log(`✅ [Cache Manager] Cleared ${count} sessionStorage items`);
};

/**
 * Clear browser cache (Service Worker, HTTP cache)
 */
export const clearBrowserCache = async (): Promise<void> => {
  console.log('🧹 [Cache Manager] Clearing browser cache...');

  try {
    // Clear Service Worker caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          console.log(`🗑️ [Cache Manager] Deleting cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
      console.log(`✅ [Cache Manager] Cleared ${cacheNames.length} browser caches`);
    }
  } catch (error) {
    console.error('❌ [Cache Manager] Failed to clear browser cache:', error);
  }
};

/**
 * Verify that protected keys still exist after clearing
 */
export const verifyProtectedKeys = (): { allProtected: boolean; missing: string[] } => {
  console.log('🔍 [Cache Manager] Verifying protected keys...');
  
  const missing: string[] = [];
  
  PROTECTED_KEYS.forEach(key => {
    const value = localStorage.getItem(key);
    if (!value) {
      missing.push(key);
      console.warn(`⚠️ [Cache Manager] Protected key missing: ${key}`);
    } else {
      console.log(`✅ [Cache Manager] Protected key exists: ${key}`);
    }
  });

  const allProtected = missing.length === 0;
  
  if (allProtected) {
    console.log('✅ [Cache Manager] All protected keys verified!');
  } else {
    console.error('❌ [Cache Manager] Some protected keys are missing:', missing);
  }

  return { allProtected, missing };
};

// ============================================
// SMART CACHE UPDATE STRATEGY
// ============================================

/**
 * Check and perform cache update if app version changed
 * This runs on app startup
 */
export const smartCacheUpdate = async (): Promise<void> => {
  console.log('🔍 [Cache Manager] Checking for app updates...');
  
  const storedVersion = getStoredVersion();
  const currentVersion = getCurrentVersion();

  console.log('📊 [Cache Manager] Version check:', {
    stored: storedVersion,
    current: currentVersion,
    hasChanged: hasVersionChanged()
  });

  if (hasVersionChanged()) {
    console.log('🚀 [Cache Manager] New version detected! Performing safe cache update...');
    
    // Step 1: Backup protected data
    const backups = backupProtectedData();
    console.log('💾 [Cache Manager] Protected data backed up:', Object.keys(backups));

    // Step 2: Clear cache safely (will skip protected keys)
    clearCacheSafely();

    // Step 3: Clear sessionStorage (safe)
    clearSessionStorage();

    // Step 4: Clear browser cache (Service Worker)
    await clearBrowserCache();

    // Step 5: Restore protected data (just in case)
    restoreProtectedData(backups);

    // Step 6: Update version
    updateAppVersion();

    // Step 7: Verify everything is intact
    const verification = verifyProtectedKeys();
    
    if (verification.allProtected) {
      console.log('🎉 [Cache Manager] Cache updated successfully! Notifications preserved.');
    } else {
      console.error('❌ [Cache Manager] Cache update completed with warnings. Some protected data may be missing.');
    }

    return;
  }

  console.log('✅ [Cache Manager] App version unchanged. No cache update needed.');
};

/**
 * Backup protected data to memory
 */
const backupProtectedData = (): Record<string, string | null> => {
  const backups: Record<string, string | null> = {};
  
  PROTECTED_KEYS.forEach(key => {
    backups[key] = localStorage.getItem(key);
  });

  return backups;
};

/**
 * Restore protected data from memory backup
 */
const restoreProtectedData = (backups: Record<string, string | null>): void => {
  console.log('🔄 [Cache Manager] Restoring protected data...');
  
  let restoredCount = 0;
  
  Object.entries(backups).forEach(([key, value]) => {
    if (value !== null) {
      // Only restore if current value is missing
      const currentValue = localStorage.getItem(key);
      if (!currentValue) {
        localStorage.setItem(key, value);
        restoredCount++;
        console.log(`♻️ [Cache Manager] Restored: ${key}`);
      }
    }
  });

  if (restoredCount > 0) {
    console.log(`✅ [Cache Manager] Restored ${restoredCount} protected items`);
  } else {
    console.log('✅ [Cache Manager] All protected data intact, no restoration needed');
  }
};

// ============================================
// MANUAL CACHE MANAGEMENT (Developer Tools)
// ============================================

/**
 * Force clear ALL cache (including protected keys)
 * ⚠️ WARNING: This will clear notifications! Only for development/debugging.
 */
export const forceClearAll = async (): Promise<void> => {
  console.warn('⚠️ [Cache Manager] FORCE CLEAR ALL - This will remove notifications!');
  
  // Clear localStorage completely
  const localStorageCount = localStorage.length;
  localStorage.clear();
  console.log(`🗑️ Cleared ${localStorageCount} localStorage items`);

  // Clear sessionStorage
  const sessionStorageCount = sessionStorage.length;
  sessionStorage.clear();
  console.log(`🗑️ Cleared ${sessionStorageCount} sessionStorage items`);

  // Clear browser cache
  await clearBrowserCache();

  console.log('✅ [Cache Manager] Force clear completed. Reload page to apply changes.');
};

/**
 * Get cache statistics
 */
export const getCacheStats = (): {
  localStorage: { total: number; protected: number; other: number };
  sessionStorage: { total: number };
  protectedKeys: string[];
  appVersion: { current: string; stored: string | null };
} => {
  let protectedCount = 0;
  let otherCount = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const isProtected = PROTECTED_KEYS.some(protectedKey => 
        key === protectedKey || key.includes(protectedKey)
      );
      if (isProtected) {
        protectedCount++;
      } else {
        otherCount++;
      }
    }
  }

  return {
    localStorage: {
      total: localStorage.length,
      protected: protectedCount,
      other: otherCount
    },
    sessionStorage: {
      total: sessionStorage.length
    },
    protectedKeys: PROTECTED_KEYS,
    appVersion: {
      current: getCurrentVersion(),
      stored: getStoredVersion()
    }
  };
};

// ============================================
// GLOBAL DEBUG HELPERS
// ============================================

if (typeof window !== 'undefined') {
  (window as any).cacheManager = {
    stats: getCacheStats,
    clearSafely: clearCacheSafely,
    smartUpdate: smartCacheUpdate,
    verify: verifyProtectedKeys,
    forceClearAll: forceClearAll,
    version: {
      current: getCurrentVersion,
      stored: getStoredVersion,
      hasChanged: hasVersionChanged,
      update: updateAppVersion
    }
  };

  console.log('🛠️ [Cache Manager] Debug tools available:');
  console.log('   window.cacheManager.stats() - View cache statistics');
  console.log('   window.cacheManager.clearSafely() - Safe cache clear');
  console.log('   window.cacheManager.smartUpdate() - Check and update cache');
  console.log('   window.cacheManager.verify() - Verify protected keys');
  console.log('   window.cacheManager.version - Version management');
}

// ============================================
// EXPORTS
// ============================================

export default {
  clearCacheSafely,
  clearSessionStorage,
  clearBrowserCache,
  smartCacheUpdate,
  verifyProtectedKeys,
  getCacheStats,
  forceClearAll,
  hasVersionChanged,
  updateAppVersion,
  getCurrentVersion,
  getStoredVersion,
  PROTECTED_KEYS
};

