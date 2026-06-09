
import * as React from "react"

const MOBILE_BREAKPOINT = 640
const TABLET_BREAKPOINT = 1024

/** Match Orderflow: bottom nav only below `md` (768px); tablet/iPad use rail layout. */
const COMPACT_ORDERFLOW_NAV_BREAKPOINT_PX = 768

export function useCompactOrderflowNav() {
  const [compact, setCompact] = React.useState(
    typeof window !== "undefined"
      ? window.innerWidth < COMPACT_ORDERFLOW_NAV_BREAKPOINT_PX
      : true
  )

  React.useEffect(() => {
    const mql = window.matchMedia(
      `(max-width: ${COMPACT_ORDERFLOW_NAV_BREAKPOINT_PX - 1}px)`
    )
    const onChange = () =>
      setCompact(window.innerWidth < COMPACT_ORDERFLOW_NAV_BREAKPOINT_PX)
    mql.addEventListener("change", onChange)
    setCompact(window.innerWidth < COMPACT_ORDERFLOW_NAV_BREAKPOINT_PX)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return compact
}

/** PWA / “Add to Home Screen” — matches Orderflow `getStandaloneDisplayMode`. */
function getStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
  } catch {
    /* ignore */
  }
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

/**
 * Add-to-home-screen / standalone display — Orderflow `useStandaloneDisplayMode`
 * (comments pill + expanded shell use tighter chrome on A2HS).
 */
export function useStandaloneDisplayMode() {
  const [standalone, setStandalone] = React.useState(() =>
    typeof window !== "undefined" ? getStandaloneDisplayMode() : false,
  );

  React.useEffect(() => {
    const sync = () => setStandalone(getStandaloneDisplayMode());
    sync();
    let mq: MediaQueryList | null = null;
    try {
      mq = window.matchMedia("(display-mode: standalone)");
      mq.addEventListener("change", sync);
    } catch {
      /* ignore */
    }
    window.addEventListener("resize", sync);
    return () => {
      mq?.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  return standalone;
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    mql.addEventListener("change", onChange)
    onChange() // Set initial value
    
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${TABLET_BREAKPOINT - 1}px)`)
    
    const onChange = () => {
      const width = window.innerWidth
      setIsTablet(width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT)
    }
    
    mql.addEventListener("change", onChange)
    
    // Also listen for orientation changes
    window.addEventListener('orientationchange', onChange)
    onChange() // Set initial value
    
    return () => {
      mql.removeEventListener("change", onChange)
      window.removeEventListener('orientationchange', onChange)
    }
  }, [])

  return !!isTablet
}

export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${TABLET_BREAKPOINT}px)`)
    
    const onChange = () => {
      setIsDesktop(window.innerWidth >= TABLET_BREAKPOINT)
    }
    
    mql.addEventListener("change", onChange)
    onChange() // Set initial value
    
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isDesktop
}
