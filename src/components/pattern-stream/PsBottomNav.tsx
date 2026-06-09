import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Compass,
  ArrowSquareOut,
  GearSix,
} from "@phosphor-icons/react";

/** Pixels of scroll delta before toggling; dampens jitter. */
const SCROLL_DELTA_THRESHOLD = 8;
/** Near top of page: always show bar. */
const TOP_SHOW_THRESHOLD = 24;

/**
 * Auto-hide bottom nav when scrolling down, reveal on scroll up.
 * Matches Orderflow MobileBottomNavigation behavior.
 */
function useBottomNavAutoHide(pathname: string) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    setHidden(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY || window.pageYOffset;
      const delta = y - lastY.current;
      lastY.current = y;
      if (y <= TOP_SHOW_THRESHOLD) {
        setHidden(false);
        return;
      }
      if (delta > SCROLL_DELTA_THRESHOLD) setHidden(true);
      else if (delta < -SCROLL_DELTA_THRESHOLD) setHidden(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return hidden;
}

interface PsBottomNavProps {
  /** Hide the nav (e.g. when in a chat room). */
  hidden?: boolean;
  /**
   * `fixed` — default full-width bottom bar (Pattern Stream).
   * `embedded` — fixed full-width dock + safe-area (e.g. Insight); includes frosted blur band.
   */
  variant?: "fixed" | "embedded";
  /** Tighter pill + tabs (~44px total) to pair with SignalStreamFooterNav row. */
  slim?: boolean;
  /** Landmark label when `variant="embedded"` (e.g. Insight). */
  embeddedNavigationAriaLabel?: string;
}

/**
 * Pattern Stream bottom nav: Discover / Signals / Settings.
 * "Discover" matches `/insight` but is excluded for `/insight/settings` so the Settings tab wins
 * its highlight when nested inside Insight.
 * Provider console is reachable from Settings → Provider tools and the Compose FAB, not the bottom nav.
 */
const TABS = [
  { to: "/dashboard/insight", icon: Compass, label: "Discover", match: "/insight", excludeMatch: "/insight/settings" },
  { to: "/dashboard/signal-stream", icon: ArrowSquareOut, label: "Signals", match: "__signals__" },
  { to: "/dashboard/insight/settings", icon: GearSix, label: "Settings", match: "/insight/settings" },
] as const;

/** Embedded Insight shell: no Discover tab (Discover is the main feed route + header toggle). */
const EMBEDDED_INSIGHT_TABS = [
  { to: "/dashboard/signal-stream", icon: ArrowSquareOut, label: "Signals", match: "__signals__" },
  { to: "/dashboard/insight/settings", icon: GearSix, label: "Settings", match: "/insight/settings" },
] as const;

const EMBEDDED_NAV_SPRING = {
  type: "spring" as const,
  stiffness: 320,
  damping: 30,
};

export function PsBottomNav({
  hidden: extHidden = false,
  variant = "fixed",
  slim = false,
  embeddedNavigationAriaLabel = "Pattern Stream",
}: PsBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const autoHidden = useBottomNavAutoHide(location.pathname);
  const hidden = extHidden || autoHidden;

  const isInsightShell = variant === "embedded";

  /**
   * Embedded shell matches the Insight search-input pill: flat `bg-muted/50` (`/40` in dark),
   * `border-border/80`, `rounded-full` — no liquid-glass / SVG displacement.
   */
  const shellClass = isInsightShell
    ? "ps-bottom-nav-shell flex items-stretch justify-around px-1 rounded-full border border-border/80 bg-muted/50 dark:bg-muted/40 " +
      (slim ? "gap-0.5 py-0.5" : "gap-1 py-1.5")
    : "liquid-glass ps-bottom-nav-shell flex items-stretch justify-around px-1 " +
      (slim ? "gap-0.5 py-0.5" : "gap-1 py-1.5");

  const tabClass =
    "ps-bottom-tab flex-1 flex flex-col items-center justify-center rounded-full " +
    (slim ? "gap-0 px-1.5 py-1" : "gap-0.5 px-2 py-1.5");

  const iconSize = slim ? 18 : 20;
  const labelSize = slim ? 9 : 10;

  const activeIconColor = isInsightShell
    ? "hsl(var(--foreground))"
    : "var(--ps-green)";
  const inactiveIconColor = isInsightShell
    ? "hsl(var(--muted-foreground))"
    : "var(--ps-text-secondary)";
  const activeLabelColor = isInsightShell
    ? "hsl(var(--foreground))"
    : "var(--ps-text)";
  const inactiveLabelColor = isInsightShell
    ? "hsl(var(--muted-foreground))"
    : "var(--ps-text-tertiary)";

  const tabsForShell = isInsightShell ? EMBEDDED_INSIGHT_TABS : TABS;

  const inner = (
    <div className="mx-auto w-full max-w-lg md:max-w-[640px]">
      <div className={shellClass}>
        {tabsForShell.map((tab) => {
          const Icon = tab.icon;
          const excludeMatch = "excludeMatch" in tab ? tab.excludeMatch : undefined;
          const matchesPath = location.pathname.includes(tab.match);
          const excludedByOther = excludeMatch
            ? location.pathname.includes(excludeMatch)
            : false;
          const isActive =
            tab.match === "__signals__"
              ? location.pathname === "/dashboard/signal-stream"
              : matchesPath && !excludedByOther;

          const handleClick = (e: React.MouseEvent) => {
            if (tab.match === "__signals__") {
              e.preventDefault();
              navigate(tab.to);
            }
          };

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              onClick={handleClick}
              className={tabClass}
              data-active={isActive}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                size={iconSize}
                weight={isActive ? "fill" : "regular"}
                style={{
                  color: isActive ? activeIconColor : inactiveIconColor,
                }}
              />
              <span
                style={{
                  fontSize: labelSize,
                  fontWeight: isActive ? 600 : 500,
                  lineHeight: 1.1,
                  color: isActive ? activeLabelColor : inactiveLabelColor,
                }}
              >
                {tab.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );

  if (variant === "embedded") {
    return (
      <motion.nav
        role="navigation"
        aria-label={embeddedNavigationAriaLabel}
        initial={false}
        animate={{ y: hidden ? 100 : 0, opacity: hidden ? 0 : 1 }}
        transition={EMBEDDED_NAV_SPRING}
        className="pointer-events-none fixed bottom-0 left-0 right-0 z-[100] pb-safe w-full"
      >
        <div className="insight-bottom-nav-fade-blur" aria-hidden />
        <div
          className="relative z-[1] w-full"
          role="tablist"
          aria-label="Pattern Stream navigation"
          style={{ pointerEvents: hidden ? "none" : "auto" }}
        >
          {inner}
        </div>
      </motion.nav>
    );
  }

  return (
    <motion.nav
      role="tablist"
      aria-label="Pattern Stream navigation"
      initial={false}
      animate={{ y: hidden ? 100 : 0, opacity: hidden ? 0 : 1 }}
      transition={EMBEDDED_NAV_SPRING}
      className="ps-bottom-nav fixed left-0 right-0 z-40"
      style={{
        bottom: 0,
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)",
        paddingLeft: "max(env(safe-area-inset-left, 0px), 8px)",
        paddingRight: "max(env(safe-area-inset-right, 0px), 8px)",
        pointerEvents: hidden ? "none" : "auto",
      }}
    >
      {inner}
    </motion.nav>
  );
}
