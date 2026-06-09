import { useEffect, useRef, useState } from "react";

/**
 * Orderflow-style hide-on-scroll behavior.
 * - Scroll DOWN: hide
 * - Scroll UP by 8px+: show
 * - Always visible at top of page
 */
export function useScrollHideNav(target?: HTMLElement | Window | null) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const cumUp = useRef(0);

  useEffect(() => {
    const el: HTMLElement | Window = (target as HTMLElement) ?? window;
    const getY = () => (el === window ? window.scrollY : (el as HTMLElement).scrollTop);
    lastY.current = getY();

    const onScroll = () => {
      const y = getY();
      const dy = y - lastY.current;
      if (y < 16) {
        setHidden(false);
        cumUp.current = 0;
        lastY.current = y;
        return;
      }
      if (dy > 4) {
        setHidden(true);
        cumUp.current = 0;
      } else if (dy < 0) {
        cumUp.current += -dy;
        if (cumUp.current > 8) {
          setHidden(false);
          cumUp.current = 0;
        }
      }
      lastY.current = y;
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [target]);

  return hidden;
}
