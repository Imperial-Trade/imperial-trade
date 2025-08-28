
import { useCallback, useRef } from 'react';

/**
 * Hook to batch DOM reads and prevent forced reflows
 * Optimizes layout-triggering operations by batching them
 */
export function useOptimizedReflow() {
  const pendingReads = useRef<(() => void)[]>([]);
  const isScheduled = useRef(false);

  const batchLayoutRead = useCallback((readFn: () => void) => {
    pendingReads.current.push(readFn);
    
    if (!isScheduled.current) {
      isScheduled.current = true;
      requestAnimationFrame(() => {
        // Execute all reads in one frame
        pendingReads.current.forEach(fn => fn());
        pendingReads.current = [];
        isScheduled.current = false;
      });
    }
  }, []);

  const safeGetBoundingRect = useCallback((element: Element | null) => {
    if (!element) return null;
    
    return new Promise<DOMRect>((resolve) => {
      batchLayoutRead(() => {
        resolve(element.getBoundingClientRect());
      });
    });
  }, [batchLayoutRead]);

  return { batchLayoutRead, safeGetBoundingRect };
}
