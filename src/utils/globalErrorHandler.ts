/**
 * Global error handler for chunk loading failures
 * 
 * Catches chunk loading errors at the window level before they reach React.
 * This provides a first line of defense for deployment-related cache issues.
 */

let chunkErrorHandlerInstalled = false;

export const installGlobalChunkErrorHandler = (): void => {
  if (chunkErrorHandlerInstalled) {
    console.log('⚠️ [globalErrorHandler] Already installed, skipping');
    return;
  }

  console.log('🛡️ [globalErrorHandler] Installing global chunk error handler');

  // Listen for unhandled errors at window level
  window.addEventListener('error', (event) => {
    const errorMessage = event.message || event.error?.message || '';
    
    const isChunkLoadError = 
      errorMessage.includes('Failed to fetch dynamically imported module') ||
      errorMessage.includes('Importing a module script failed') ||
      errorMessage.includes('error loading dynamically imported module') ||
      errorMessage.includes('ChunkLoadError');

    if (isChunkLoadError) {
      console.error('🚨 [globalErrorHandler] Chunk loading error detected:', errorMessage);
      
      const hasAlreadyRefreshed = sessionStorage.getItem('chunk-error-auto-refresh') === 'true';
      
      if (!hasAlreadyRefreshed) {
        console.log('🔄 [globalErrorHandler] First chunk error, attempting auto-recovery...');
        
        // Prevent infinite loops
        sessionStorage.setItem('chunk-error-auto-refresh', 'true');
        
        // Clear caches before reload
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
          });
        }
        
        // Reload after brief delay
        setTimeout(() => {
          console.log('🔄 [globalErrorHandler] Reloading page...');
          window.location.reload();
        }, 500);
        
        // Prevent error from propagating
        event.preventDefault();
        return;
      }
      
      // Second error - let it propagate to Error Boundary
      console.error('❌ [globalErrorHandler] Chunk error persists after reload, escalating to Error Boundary');
      sessionStorage.removeItem('chunk-error-auto-refresh');
    }
  });

  // Listen for unhandled promise rejections (for dynamic imports)
  window.addEventListener('unhandledrejection', (event) => {
    const errorMessage = event.reason?.message || String(event.reason) || '';
    
    const isChunkLoadError = 
      errorMessage.includes('Failed to fetch dynamically imported module') ||
      errorMessage.includes('Importing a module script failed') ||
      errorMessage.includes('error loading dynamically imported module');

    if (isChunkLoadError) {
      console.error('🚨 [globalErrorHandler] Unhandled chunk loading rejection:', errorMessage);
      
      const hasAlreadyRefreshed = sessionStorage.getItem('chunk-error-auto-refresh') === 'true';
      
      if (!hasAlreadyRefreshed) {
        console.log('🔄 [globalErrorHandler] Triggering auto-recovery for unhandled rejection...');
        sessionStorage.setItem('chunk-error-auto-refresh', 'true');
        
        setTimeout(() => {
          window.location.reload();
        }, 500);
        
        event.preventDefault();
        return;
      }
    }
  });

  // Clear the refresh flag on successful navigation
  window.addEventListener('load', () => {
    // Small delay to ensure all chunks loaded successfully
    setTimeout(() => {
      if (sessionStorage.getItem('chunk-error-auto-refresh') === 'true') {
        console.log('✅ [globalErrorHandler] Page loaded successfully after refresh, clearing flag');
        sessionStorage.removeItem('chunk-error-auto-refresh');
      }
    }, 2000);
  });

  chunkErrorHandlerInstalled = true;
  console.log('✅ [globalErrorHandler] Global chunk error handler installed');
};

