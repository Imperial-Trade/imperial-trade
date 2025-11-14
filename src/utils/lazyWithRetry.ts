import { lazy, ComponentType } from 'react';

/**
 * Enhanced lazy loading with automatic retry on chunk loading failures
 * 
 * This wrapper catches "Failed to fetch dynamically imported module" errors
 * that occur when a new deployment invalidates cached chunk references.
 * 
 * Recovery strategy:
 * 1. First failure: Automatically reload the page to fetch fresh assets
 * 2. Second failure: Throw error to Error Boundary for user-facing error
 * 
 * Prevents infinite reload loops with sessionStorage flag.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      
      // Success - clear the refresh flag
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      
      return component;
    } catch (error: any) {
      // Check if this is a chunk loading error
      const isChunkLoadError = 
        error?.message?.includes('Failed to fetch dynamically imported module') ||
        error?.message?.includes('Importing a module script failed') ||
        error?.message?.includes('error loading dynamically imported module');

      if (isChunkLoadError && !pageHasAlreadyBeenForceRefreshed) {
        // First failure - attempt automatic recovery
        console.log('🔄 [lazyWithRetry] Chunk loading failed, reloading page to get fresh assets...');
        console.log('📦 Failed chunk:', error?.message);
        
        // Set flag to prevent infinite loops
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        
        // Reload the page
        window.location.reload();
        
        // Return a dummy component to prevent errors during reload
        return { default: (() => null) as T };
      }
      
      // Second failure or non-chunk error - throw to Error Boundary
      console.error('❌ [lazyWithRetry] Component loading failed:', error);
      throw error;
    }
  });
}

