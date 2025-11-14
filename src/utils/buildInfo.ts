/**
 * Build version tracking and cache validation
 * 
 * Tracks build timestamps to detect when a new version has been deployed.
 * Helps prevent chunk loading errors by detecting stale cached assets.
 */

// Vite will inject this at build time
declare const __BUILD_TIMESTAMP__: string;

// Use import.meta.env as fallback for development
export const BUILD_TIMESTAMP = 
  typeof __BUILD_TIMESTAMP__ !== 'undefined' 
    ? __BUILD_TIMESTAMP__ 
    : import.meta.env.VITE_BUILD_TIMESTAMP || Date.now().toString();

export const BUILD_VERSION = new Date(parseInt(BUILD_TIMESTAMP)).toISOString();

/**
 * Check if the current build is stale compared to cached version
 * Returns true if a new build has been deployed since last visit
 */
export const isBuildStale = (): boolean => {
  const lastKnownBuild = localStorage.getItem('app-build-timestamp');
  
  if (!lastKnownBuild) {
    // First visit - store current build timestamp
    localStorage.setItem('app-build-timestamp', BUILD_TIMESTAMP);
    return false;
  }
  
  // Compare timestamps
  const isStale = lastKnownBuild !== BUILD_TIMESTAMP;
  
  if (isStale) {
    console.log('🔄 [buildInfo] New build detected:', {
      old: new Date(parseInt(lastKnownBuild)).toISOString(),
      new: BUILD_VERSION
    });
    
    // Update stored timestamp
    localStorage.setItem('app-build-timestamp', BUILD_TIMESTAMP);
  }
  
  return isStale;
};

/**
 * Clear all caches when a new build is detected
 */
export const clearStaleCache = async (): Promise<void> => {
  console.log('🧹 [buildInfo] Clearing stale caches...');
  
  try {
    // Clear Cache API (service workers)
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          console.log('🗑️ Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }
    
    // Clear service worker registrations
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(registration => {
          console.log('🗑️ Unregistering service worker:', registration.scope);
          return registration.unregister();
        })
      );
    }
    
    // Clear stale localStorage items
    Object.keys(localStorage).forEach(key => {
      if (key.includes('cache') || key.includes('version') || key.includes('chunk')) {
        console.log('🗑️ Removing localStorage item:', key);
        localStorage.removeItem(key);
      }
    });
    
    console.log('✅ [buildInfo] Cache cleanup complete');
  } catch (error) {
    console.error('❌ [buildInfo] Cache cleanup failed:', error);
  }
};

/**
 * Log build information to console
 */
export const logBuildInfo = (): void => {
  console.log('📦 [Build Info]', {
    timestamp: BUILD_TIMESTAMP,
    version: BUILD_VERSION,
    env: import.meta.env.MODE,
  });
};

