import React, { useRef, useCallback } from 'react';

interface ThrottleConfig {
  interval: number; // Minimum time between renders in ms
  maxDelay: number; // Maximum delay before forcing a render
}

const DEFAULT_CONFIG: ThrottleConfig = {
  interval: 100, // 100ms minimum between renders
  maxDelay: 500, // Force render after 500ms max
};

/**
 * 🎯 FLICKER ELIMINATION: Component Re-render Throttling
 * 
 * This hook provides render throttling to prevent excessive re-renders
 * during stable periods while ensuring critical updates are never blocked.
 * 
 * Priority 3: Optimize Component Re-render Strategy
 * - Consolidate price and quality updates into single render cycle
 * - Add React.startTransition for non-critical updates  
 * - Implement component-level render throttling during stable periods
 */
export const useRenderThrottling = (config: Partial<ThrottleConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const lastRenderRef = useRef<number>(0);
  const pendingRenderRef = useRef<NodeJS.Timeout | null>(null);
  const forcedRenderRef = useRef<NodeJS.Timeout | null>(null);
  
  const throttledUpdate = useCallback((
    updateFn: () => void,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ) => {
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderRef.current;
    
    // High priority updates bypass throttling
    if (priority === 'high') {
      updateFn();
      lastRenderRef.current = now;
      
      // Clear any pending renders since we just rendered
      if (pendingRenderRef.current) {
        clearTimeout(pendingRenderRef.current);
        pendingRenderRef.current = null;
      }
      if (forcedRenderRef.current) {
        clearTimeout(forcedRenderRef.current);
        forcedRenderRef.current = null;
      }
      return;
    }
    
    // If enough time has passed, render immediately
    if (timeSinceLastRender >= finalConfig.interval) {
      updateFn();
      lastRenderRef.current = now;
      return;
    }
    
    // Otherwise, schedule a throttled render
    if (!pendingRenderRef.current) {
      const delay = finalConfig.interval - timeSinceLastRender;
      
      pendingRenderRef.current = setTimeout(() => {
        updateFn();
        lastRenderRef.current = Date.now();
        pendingRenderRef.current = null;
        
        // Clear forced render since we just rendered
        if (forcedRenderRef.current) {
          clearTimeout(forcedRenderRef.current);
          forcedRenderRef.current = null;
        }
      }, delay);
      
      // Set up forced render to ensure we don't delay too long
      if (!forcedRenderRef.current) {
        forcedRenderRef.current = setTimeout(() => {
          if (pendingRenderRef.current) {
            clearTimeout(pendingRenderRef.current);
            pendingRenderRef.current = null;
          }
          
          updateFn();
          lastRenderRef.current = Date.now();
          forcedRenderRef.current = null;
        }, finalConfig.maxDelay);
      }
    }
  }, [finalConfig]);
  
  const withTransition = useCallback((updateFn: () => void) => {
    if (React.startTransition) {
      React.startTransition(() => {
        throttledUpdate(updateFn, 'low');
      });
    } else {
      throttledUpdate(updateFn, 'low');
    }
  }, [throttledUpdate]);
  
  // Cleanup function
  const cleanup = useCallback(() => {
    if (pendingRenderRef.current) {
      clearTimeout(pendingRenderRef.current);
      pendingRenderRef.current = null;
    }
    if (forcedRenderRef.current) {
      clearTimeout(forcedRenderRef.current);
      forcedRenderRef.current = null;
    }
  }, []);
  
  // Cleanup on unmount
  React.useEffect(() => {
    return cleanup;
  }, [cleanup]);
  
  return {
    throttledUpdate,
    withTransition,
    cleanup
  };
};
