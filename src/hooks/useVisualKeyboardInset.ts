import { useEffect, useState } from 'react';

/** Same geometry as `useVisualKeyboardInset` — for guards (e.g. don’t blur composer on keyboard layout scroll). */
export function getVisualKeyboardOverlapPx(): number {
  if (typeof window === 'undefined') return 0;
  const vv = window.visualViewport;
  if (!vv) return 0;
  return Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
}

/**
 * Pixels of viewport obscured by the on-screen keyboard (iOS Safari, Android Chrome, etc.).
 * Drives extra bottom padding so scrollable areas remain usable above the keyboard.
 */
export function useVisualKeyboardInset(enabled: boolean) {
  const [insetPx, setInsetPx] = useState(0);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      setInsetPx(0);
      return;
    }

    const vv = window.visualViewport;
    if (!vv) {
      setInsetPx(0);
      return;
    }

    const update = () => {
      const overlap = getVisualKeyboardOverlapPx();
      setInsetPx(overlap);
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    /** iOS / WKWebView sometimes emit window resize before visualViewport catches up. */
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      setInsetPx(0);
    };
  }, [enabled]);

  return insetPx;
}
