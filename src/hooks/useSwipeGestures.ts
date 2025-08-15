import { useCallback, useRef, useEffect } from 'react';

interface SwipeConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  preventDefault?: boolean;
}

interface TouchData {
  x: number;
  y: number;
  time: number;
}

export function useSwipeGestures(config: SwipeConfig) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    preventDefault = true
  } = config;

  const touchStart = useRef<TouchData | null>(null);
  const touchEnd = useRef<TouchData | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (preventDefault) {
      e.preventDefault();
    }
  }, [preventDefault]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchStart.current) return;

    const touch = e.changedTouches[0];
    touchEnd.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };

    const deltaX = touchEnd.current.x - touchStart.current.x;
    const deltaY = touchEnd.current.y - touchStart.current.y;
    const deltaTime = touchEnd.current.time - touchStart.current.time;

    // Only trigger if swipe is fast enough (within 300ms)
    if (deltaTime > 300) return;

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Determine if swipe is more horizontal or vertical
    if (absDeltaX > absDeltaY) {
      // Horizontal swipe
      if (absDeltaX > threshold) {
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }
    } else {
      // Vertical swipe
      if (absDeltaY > threshold) {
        if (deltaY > 0) {
          onSwipeDown?.();
        } else {
          onSwipeUp?.();
        }
      }
    }

    // Reset
    touchStart.current = null;
    touchEnd.current = null;
  }, [threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  const addSwipeListeners = useCallback((element: HTMLElement) => {
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { addSwipeListeners };
}

// Hook for pull-to-refresh functionality
export function usePullToRefresh(onRefresh: () => void | Promise<void>) {
  const isRefreshing = useRef(false);
  const startY = useRef(0);
  const currentY = useRef(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0 && !isRefreshing.current) {
      currentY.current = e.touches[0].clientY;
      const pullDistance = currentY.current - startY.current;

      if (pullDistance > 80) {
        // Add visual feedback here
        document.body.style.transform = `translateY(${Math.min(pullDistance - 80, 50)}px)`;
        document.body.style.transition = 'transform 0.1s ease';
      }
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (window.scrollY === 0 && !isRefreshing.current) {
      const pullDistance = currentY.current - startY.current;

      if (pullDistance > 80) {
        isRefreshing.current = true;
        
        try {
          await onRefresh();
        } finally {
          isRefreshing.current = false;
          document.body.style.transform = '';
          document.body.style.transition = 'transform 0.3s ease';
          
          setTimeout(() => {
            document.body.style.transition = '';
          }, 300);
        }
      } else {
        document.body.style.transform = '';
        document.body.style.transition = 'transform 0.3s ease';
        
        setTimeout(() => {
          document.body.style.transition = '';
        }, 300);
      }
    }

    startY.current = 0;
    currentY.current = 0;
  }, [onRefresh]);

  const addPullToRefreshListeners = useCallback((element: HTMLElement) => {
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { addPullToRefreshListeners, isRefreshing: isRefreshing.current };
}