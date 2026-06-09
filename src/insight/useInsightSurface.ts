import { useEffect, useState } from 'react';

export type InsightSurface = 'phone' | 'tablet' | 'desktop';

const PHONE_MAX = 767; /* < md (768) */
const TABLET_MAX = 1023; /* < lg (1024) */

function readSurface(): InsightSurface {
  if (typeof window === 'undefined') return 'phone';
  const w = window.innerWidth;
  /**
   * Treat installed iPad-PWA in portrait as a "phone" surface so the WhatsApp-style row list
   * is shown instead of the desktop two-pane. iPad landscape (>= 1024) becomes desktop.
   */
  const isStandalone =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(display-mode: standalone)').matches
      : false;
  if (isStandalone && w < TABLET_MAX) return 'phone';
  if (w <= PHONE_MAX) return 'phone';
  if (w <= TABLET_MAX) return 'tablet';
  return 'desktop';
}

/**
 * Returns the current Insight surface bucket: `phone | tablet | desktop`.
 * - `phone`: < 768px or installed PWA on portrait iPad
 * - `tablet`: 768–1023px (iPad portrait in browser)
 * - `desktop`: >= 1024px
 *
 * Insight surfaces use this to switch single-column list layouts vs. two-pane master/detail.
 */
export function useInsightSurface(): InsightSurface {
  const [surface, setSurface] = useState<InsightSurface>(() => readSurface());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setSurface(readSurface());
    onResize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    const mq = window.matchMedia('(display-mode: standalone)');
    mq.addEventListener?.('change', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      mq.removeEventListener?.('change', onResize);
    };
  }, []);

  return surface;
}
