/**
 * Detects and fixes React duplication issues that cause "Cannot read properties of null (reading 'useState')" errors
 */

export function detectAndFixReactDuplication() {
  const isDuplicate = checkForDuplicateReact();
  
  if (isDuplicate) {
    console.error('🚨 [React Duplication] Multiple React instances detected!');
    console.error('🔧 [React Duplication] Clearing cache and forcing IMMEDIATE reload...');
    
    // Clear all caches
    clearAllCaches();
    
    // Set flag to prevent infinite reloads
    const hasReloaded = sessionStorage.getItem('react-duplication-reload');
    if (!hasReloaded) {
      sessionStorage.setItem('react-duplication-reload', 'true');
      // Force IMMEDIATE reload
      window.location.reload();
    } else {
      console.error('🚨 [React Duplication] Reload already attempted. Cache may be corrupted.');
      console.error('🔧 [React Duplication] Try: Ctrl+Shift+Delete → Clear cached images and files');
    }
  } else {
    // Clear the reload flag on successful load
    sessionStorage.removeItem('react-duplication-reload');
  }
  
  return isDuplicate;
}

function checkForDuplicateReact(): boolean {
  try {
    // Method 1: Check if React is in window multiple times
    const reactInstances = [];
    for (const key in window) {
      if (key.includes('react') || key.includes('React')) {
        reactInstances.push(key);
      }
    }
    
    if (reactInstances.length > 2) {
      console.warn('⚠️ Multiple React-related globals found:', reactInstances);
      return true;
    }
    
    // Method 2: Check if __REACT_DEVTOOLS_GLOBAL_HOOK__ has duplicates
    const devtools = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (devtools?.renderers) {
      const rendererCount = devtools.renderers.size;
      if (rendererCount > 1) {
        console.warn('⚠️ Multiple React renderers detected:', rendererCount);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking for React duplication:', error);
    return false;
  }
}

function clearAllCaches() {
  try {
    // Clear localStorage React-related keys
    Object.keys(localStorage).forEach(key => {
      if (key.includes('react') || key.includes('vite') || key.includes('cache')) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear service worker caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    
    console.log('✅ [React Duplication] Caches cleared');
  } catch (error) {
    console.error('Error clearing caches:', error);
  }
}
