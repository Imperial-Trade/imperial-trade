import { useEffect, useRef, useState } from "react";

export interface PullToRefreshState {
  pulling: boolean;
  progress: number;
  refreshing: boolean;
}

interface Options {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  enabled?: boolean;
  scrollEl?: HTMLElement | null;
}

export function usePullToRefresh({ onRefresh, threshold = 60, enabled = true, scrollEl }: Options) {
  const [state, setState] = useState<PullToRefreshState>({
    pulling: false,
    progress: 0,
    refreshing: false,
  });
  const startY = useRef(0);
  const pulling = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const el = scrollEl ?? document.scrollingElement ?? document.body;

    const onTouchStart = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? 0;
      const top = el === document.body || el === document.scrollingElement ? window.scrollY : (el as HTMLElement).scrollTop;
      if (top <= 0) {
        startY.current = y;
        pulling.current = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current) return;
      const y = e.touches[0]?.clientY ?? 0;
      const dy = y - startY.current;
      if (dy <= 0) {
        setState((s) => ({ ...s, pulling: false, progress: 0 }));
        return;
      }
      const eased = Math.min(1, dy / (threshold * 1.6));
      setState({ pulling: true, progress: eased, refreshing: false });
    };

    const onTouchEnd = async () => {
      if (!pulling.current) return;
      const trigger = state.progress >= 1;
      pulling.current = false;
      if (trigger) {
        setState({ pulling: false, progress: 1, refreshing: true });
        try {
          if ("vibrate" in navigator) navigator.vibrate?.(8);
          await onRefresh();
        } finally {
          setTimeout(() => setState({ pulling: false, progress: 0, refreshing: false }), 220);
        }
      } else {
        setState({ pulling: false, progress: 0, refreshing: false });
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [enabled, threshold, onRefresh, scrollEl, state.progress]);

  return state;
}
