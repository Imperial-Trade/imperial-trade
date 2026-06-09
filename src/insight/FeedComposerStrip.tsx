import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import {
  orderflowGlassBackdropClassName,
  ORDERFLOW_FEED_STRIP_HEIGHT_CSS_VAR,
  orderflowFeedCommentsLiquidGlassTint,
  orderflowFeedCommentsLiquidGlassExpandedShadow,
  feedComposeLiquidAppBarChromeClass,
  feedComposeLiquidAppBarInnerColumnClass,
  profileStandaloneHeaderGlassGradientClass,
} from '@/insight/orderflowChrome';

export interface FeedComposerStripProps {
  children: React.ReactNode;
  /** `feed`: compact phones — same column as bottom nav (`max-w-lg` + 0.5rem/safe-area); `md+` — `px-6` + 640px (rail). `community`: px-0. */
  variant?: 'feed' | 'community';
  /**
   * `fixed` — bar pinned to viewport; spacer reserves height so content scrolls underneath (home feed).
   * `sticky` — in-flow sticky (e.g. community: back link stays above tabs).
   * `static` — normal flow (e.g. mobile search column: header sits above a nested scroll region).
   */
  behavior?: 'fixed' | 'sticky' | 'static';
  /** e.g. compact nav control that opens `WidgetSidebar` */
  leadingAccessory?: React.ReactNode;
  /**
   * When `behavior="fixed"`, skip the in-flow spacer (parent supplies layout offset, e.g. portaled strip above a drawer).
   */
  omitSpacer?: boolean;
  /** Override default `z-30` on the fixed bar (e.g. comment thread portaled above sheet content). */
  fixedClassName?: string;
  /**
   * When `behavior="fixed"`, pin under the primary feed strip (uses `--orderflow-feed-strip-height`)
   * instead of `top-0` — e.g. portaled comment composer on `/?comments=1` under the comments title strip.
   */
  pinBelowMainFeedStrip?: boolean;
  /**
   * Which `documentElement` CSS custom property receives this strip’s measured height
   * (default: main feed strip). Use a secondary var for an additional fixed row (e.g. thread composer).
   */
  stripHeightCssVar?: string;
  /**
   * Portaled thread composer above the keyboard: same liquid glass as the feed comments pill
   * (lighter blur stack than the default Following/Explore header).
   */
  chromeSurface?: 'default' | 'feedCommentsLiquid';
  /**
   * When `behavior="fixed"`, track `visualViewport` and pin the strip like the comment composer
   * so the header stays aligned when the mobile keyboard opens (e.g. full-page create post).
   */
  pinToVisualViewportWhenKeyboard?: boolean;
  /**
   * With `leadingAccessory`: `stretch` = flex row (accessory + full-width children, e.g. search).
   * `balancedTitle` = equal `1fr` side gutters so a centered title lines up with the viewport center
   * (Comments / Replies strip); does not affect search/compose.
   */
  headerLayout?: 'stretch' | 'balancedTitle';
  /**
   * `glass` — blur + translucent bar (default). `flat` — solid background, thin border (Facebook-style feed header).
   * `liquidGlassAppBar` — transparent top bar + hairline (`/?compose=1` only); pairs with comment-style pill in toolbar.
   * `minimal` — no blur/border; safe-area top only (e.g. profile: back button only).
   * `profile` — standalone profile only: no border/outline; top-to-bottom background fade (100% → 15%).
   */
  stripSurface?: 'glass' | 'flat' | 'liquidGlassAppBar' | 'minimal' | 'profile';
}

const chromeClasses = cn(
  'feed-header-chrome isolate',
  'border-b border-border/50',
  orderflowGlassBackdropClassName,
  'pt-[max(0rem,env(safe-area-inset-top))]'
);

/** Solid bar + hairline border — closer to Facebook / Meta feed top (no heavy glass). */
const flatChromeClasses = cn(
  'feed-header-chrome isolate',
  'border-b border-border/60 bg-background',
  'pt-[max(0rem,env(safe-area-inset-top))]'
);

const feedCommentsLiquidChromeClasses = cn(
  'feed-header-chrome isolate',
  'border-0',
  orderflowFeedCommentsLiquidGlassTint,
  orderflowFeedCommentsLiquidGlassExpandedShadow,
  'pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom,0px))]'
);

/** Transparent top row — no glass stack; keeps safe-area inset for fixed back control. */
const minimalChromeClasses = cn(
  'feed-header-chrome isolate',
  'border-0 bg-transparent',
  'pt-[max(0rem,env(safe-area-inset-top))]'
);

/** Standalone profile page: no border/ring; notch gradient + blur (see `profileStandaloneHeaderGlassGradientClass`). */
const profileChromeClasses = cn(
  'feed-header-chrome isolate',
  'border-0 shadow-none ring-0 outline-none',
  'pt-[max(0rem,env(safe-area-inset-top))]',
  'pb-1',
  profileStandaloneHeaderGlassGradientClass
);

/** Same width/safe-area as the fixed top feed strip inner column (bottom tab composer slot, etc.). */
export const FEED_COMPOSER_STRIP_INNER_COLUMN_CLASS = cn(
  'mx-auto w-full pb-1 pt-1',
  'max-w-lg max-lg:pl-[max(0.5rem,env(safe-area-inset-left))] max-lg:pr-[max(0.5rem,env(safe-area-inset-right))]',
  'lg:max-w-[640px] lg:px-6'
);

/** Slightly wider horizontal inset (~16px) for flat / Facebook-style tab row. */
const FEED_STRIP_INNER_COLUMN_FLAT_CLASS = cn(
  'mx-auto w-full pb-0 pt-0.5',
  'max-w-lg max-lg:pl-[max(1rem,env(safe-area-inset-left))] max-lg:pr-[max(1rem,env(safe-area-inset-right))]',
  'lg:max-w-[640px] lg:px-6'
);

/** Tight vertical padding for minimal back-only strip so main content sits higher. */
export const FEED_STRIP_INNER_COLUMN_MINIMAL_CLASS = cn(
  'mx-auto w-full pb-0 pt-0.5',
  'max-w-lg max-lg:pl-[max(0.5rem,env(safe-area-inset-left))] max-lg:pr-[max(0.5rem,env(safe-area-inset-right))]',
  'lg:max-w-[640px] lg:px-6'
);

/**
 * Top Following / Explore bar with X-style blur. Use `behavior="fixed"` on home so posts slide under the bar.
 */
export function FeedComposerStrip({
  children,
  variant = 'feed',
  behavior = 'fixed',
  leadingAccessory,
  omitSpacer = false,
  fixedClassName,
  pinBelowMainFeedStrip = false,
  stripHeightCssVar = ORDERFLOW_FEED_STRIP_HEIGHT_CSS_VAR,
  chromeSurface = 'default',
  headerLayout = 'stretch',
  pinToVisualViewportWhenKeyboard = false,
  stripSurface = 'glass',
}: FeedComposerStripProps) {
  const commentThreadKeyboardFeedGlass = false;
  const shouldTrackVisualViewport =
    commentThreadKeyboardFeedGlass || pinToVisualViewportWhenKeyboard;
  const measureRef = useRef<HTMLDivElement>(null);
  const [spacerH, setSpacerH] = useState(0);
  /** iOS: keyboard shifts the visual viewport; `fixed top-0` stays on the layout top so blur/off looks wrong — track vv while comment composer is up. */
  const [vvFrame, setVvFrame] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  useLayoutEffect(() => {
    if (
      !shouldTrackVisualViewport ||
      behavior !== 'fixed' ||
      typeof window === 'undefined'
    ) {
      setVvFrame({ top: 0, left: 0, width: 0 });
      return;
    }
    const vv = window.visualViewport;
    if (!vv) {
      setVvFrame({ top: 0, left: 0, width: 0 });
      return;
    }
    /**
     * RAF-coalesce updates from resize only. Do NOT subscribe to visualViewport `scroll`: while the
     * keyboard is open, scrolling the page fires scroll constantly and re-applying offsetTop/left
     * makes the header shake. Resize covers keyboard show/hide, zoom, and orientation.
     */
    let rafId = 0;
    let rafPending = false;
    const flush = () => {
      rafPending = false;
      rafId = 0;
      setVvFrame({
        top: Math.round(vv.offsetTop),
        left: Math.round(vv.offsetLeft),
        width: Math.round(vv.width),
      });
    };
    const scheduleFlush = () => {
      if (rafPending) return;
      rafPending = true;
      rafId = requestAnimationFrame(flush);
    };
    flush();
    vv.addEventListener('resize', scheduleFlush);
    window.addEventListener('resize', scheduleFlush);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      vv.removeEventListener('resize', scheduleFlush);
      window.removeEventListener('resize', scheduleFlush);
      setVvFrame({ top: 0, left: 0, width: 0 });
    };
  }, [shouldTrackVisualViewport, behavior]);

  /** Feed strip height → `documentElement` for sticky search chrome; spacer height when `fixed`. */
  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;
    const el = measureRef.current;
    if (!el) return;
    const update = () => {
      const h = el.getBoundingClientRect().height;
      const rounded = Math.max(1, Math.ceil(h));
      if (behavior === 'fixed') {
        setSpacerH(rounded);
      }
      if (behavior !== 'static') {
        document.documentElement.style.setProperty(
          stripHeightCssVar,
          `${rounded}px`
        );
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (behavior !== 'static') {
        document.documentElement.style.removeProperty(stripHeightCssVar);
      }
    };
  }, [
    children,
    variant,
    leadingAccessory,
    behavior,
    stripHeightCssVar,
    headerLayout,
    stripSurface,
  ]);

  const resolvedChromeClasses =
    chromeSurface === 'feedCommentsLiquid'
      ? feedCommentsLiquidChromeClasses
      : stripSurface === 'liquidGlassAppBar'
        ? feedComposeLiquidAppBarChromeClass
        : stripSurface === 'flat'
          ? flatChromeClasses
          : stripSurface === 'minimal'
            ? minimalChromeClasses
            : chromeClasses;

  const pinToVisualViewport =
    shouldTrackVisualViewport && vvFrame.width > 0;

  const innerColumn =
    variant === 'community'
      ? 'mx-auto w-full max-w-[640px] pb-1 pt-1 px-0'
      : stripSurface === 'liquidGlassAppBar'
        ? feedComposeLiquidAppBarInnerColumnClass
        : stripSurface === 'flat'
          ? FEED_STRIP_INNER_COLUMN_FLAT_CLASS
          : stripSurface === 'minimal' || stripSurface === 'profile'
            ? FEED_STRIP_INNER_COLUMN_MINIMAL_CLASS
            : FEED_COMPOSER_STRIP_INNER_COLUMN_CLASS;

  const inner = (
    <div className={innerColumn}>
      {leadingAccessory ? (
        headerLayout === 'balancedTitle' ? (
          <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,max-content)_minmax(0,1fr)] items-center gap-2">
            <div className="flex min-w-0 shrink-0 justify-start self-center">
              {leadingAccessory}
            </div>
            <div className="flex min-w-0 max-w-full justify-center justify-self-center overflow-hidden">
              {children}
            </div>
            <div className="min-w-0 shrink-0" aria-hidden />
          </div>
        ) : stripSurface === 'liquidGlassAppBar' ? (
          <div className="flex min-w-0 w-full items-end gap-2">
            <div className="shrink-0">{leadingAccessory}</div>
            <div className="flex min-w-0 max-w-full flex-1 flex-col gap-0 overflow-x-hidden">
              {children}
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 w-full items-center gap-2">
            <div className="shrink-0">{leadingAccessory}</div>
            {children != null && children !== false ? (
              <div className="min-w-0 flex-1">{children}</div>
            ) : null}
          </div>
        )
      ) : (
        children
      )}
    </div>
  );

  if (behavior === 'sticky') {
    return (
      <div
        ref={measureRef}
        data-feed-header-chrome
        className={cn(resolvedChromeClasses, 'sticky top-0 z-30')}
      >
        {inner}
      </div>
    );
  }

  if (behavior === 'static') {
    return (
      <div
        ref={measureRef}
        data-feed-header-chrome
        className={cn(resolvedChromeClasses)}
      >
        {inner}
      </div>
    );
  }

  /**
   * Above feed content when the keyboard pins the strip. Full-page compose bottom bar is z-[1242]
   * so it stays above this strip. Stay below category/backdrop (z-[1250]+) and dialogs.
   */
  const fixedZWhenKeyboardPinned = 'z-[1240]';

  const fixedChrome = (
    <div
      ref={measureRef}
      data-feed-header-chrome
      className={cn(
        resolvedChromeClasses,
        'fixed',
        pinToVisualViewport
          ? cn(fixedClassName, fixedZWhenKeyboardPinned)
          : fixedClassName ?? 'z-30',
        /* Avoid CSS interpolating transform when visual viewport jumps (keyboard dismiss feels like the bar “flies”). */
        pinToVisualViewport && 'will-change-transform transition-none',
        !pinToVisualViewport &&
          (pinBelowMainFeedStrip
            ? 'left-0 right-0 top-[var(--orderflow-feed-strip-height,3.5rem)]'
            : 'top-0 left-0 right-0')
      )}
      style={
        pinToVisualViewport
          ? {
              top: 0,
              left: 0,
              width: vvFrame.width,
              maxWidth: '100%',
              transform: `translate3d(${vvFrame.left}px, ${vvFrame.top}px, 0)`,
            }
          : undefined
      }
    >
      {inner}
    </div>
  );

  /** Render fixed chrome at `document.body` so ancestors (blur, motion, overflow) never break `position:fixed`. */
  const fixedChromePortaled =
    typeof document !== 'undefined'
      ? createPortal(fixedChrome, document.body)
      : fixedChrome;

  if (omitSpacer) {
    return fixedChromePortaled;
  }

  return (
    <>
      <div
        aria-hidden
        className="w-full shrink-0"
        style={{
          height: spacerH > 0 ? spacerH : undefined,
          minHeight: spacerH === 0 ? '3rem' : undefined,
        }}
      />
      {fixedChromePortaled}
    </>
  );
}
