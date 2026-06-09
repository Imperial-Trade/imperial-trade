import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowLeft,
  Compass,
  GraduationCap,
  MessageCircle,
  Search as SearchIcon,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { FeedComposerStrip } from '@/insight/FeedComposerStrip';
import { INSIGHT_FEED_COMPOSER_STRIP_FIXED_Z } from '@/insight/orderflowChrome';
import { InsightClassroomView } from '@/insight/InsightClassroomView';
import { InsightDiscoverRooms } from '@/insight/InsightDiscoverRooms';
import { InsightJoinedRooms } from '@/insight/InsightJoinedRooms';
import {
  InsightComposeRoomFab,
  InsightComposeRoomHeaderButton,
} from '@/insight/InsightComposeRoomButton';
import { InsightLiquidGlassBackdropFilter } from '@/insight/InsightLiquidGlassBackdropFilter';
import { useVisualKeyboardInset } from '@/hooks/useVisualKeyboardInset';
import { PsBottomNav } from '@/components/pattern-stream/PsBottomNav';
import { useCompactOrderflowNav } from '@/hooks/use-mobile';
import { useInsightSurface } from '@/insight/useInsightSurface';
import {
  InsightSettingsView,
  findSectionByPathname,
} from '@/insight/settings/InsightSettingsView';
import { SettingsTopBar } from '@/insight/settings/SettingsTopBar';
import { INSIGHT_FOCUS_RING } from '@/insight/insightCardTokens';
import { cn } from '@/lib/utils';

/** Matches Orderflow feed tokens on `html` so portaled `FeedComposerStrip` inherits the same background. */
const INSIGHT_ORDERFLOW_THEME_CLASS = 'insight-orderflow-theme';

export default function InsightPage() {
  const location = useLocation();
  const isClassroom = location.pathname.includes('/insight/classroom');
  const isSettings = location.pathname.includes('/insight/settings');
  const isRooms =
    !isSettings && location.pathname.includes('/insight/rooms');
  const compactNav = useCompactOrderflowNav();
  const surface = useInsightSurface();
  const feedColumnKeyboardInsetPx = useVisualKeyboardInset(true);

  const [roomsSearch, setRoomsSearch] = useState('');
  const [roomsSearchFocused, setRoomsSearchFocused] = useState(false);
  const [roomsSearchPillRevealPlay, setRoomsSearchPillRevealPlay] = useState(false);
  const roomsSearchInputRef = useRef<HTMLInputElement>(null);
  const prevSearchablePathnameRef = useRef<string | null>(null);

  /** Reset the rooms search field whenever the search-bearing route (Discover/Rooms) changes. */
  useEffect(() => {
    if (!isRooms && location.pathname !== '/dashboard/insight') {
      setRoomsSearch('');
    }
  }, [isRooms, location.pathname]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  /**
   * L→R clip reveal on the search pill: entering Insight discover/rooms (or focusing the
   * field) — matches Orderflow `/?search=1` + `orderflow-search-pill-reveal` in `index.css`.
   */
  useLayoutEffect(() => {
    if (isClassroom || isSettings) {
      prevSearchablePathnameRef.current = location.pathname;
      return;
    }
    const prev = prevSearchablePathnameRef.current;
    prevSearchablePathnameRef.current = location.pathname;
    if (prev !== location.pathname) {
      setRoomsSearchPillRevealPlay(true);
    }
  }, [location.pathname, isClassroom, isSettings]);

  useEffect(() => {
    document.documentElement.classList.add(INSIGHT_ORDERFLOW_THEME_CLASS);
    return () => {
      document.documentElement.classList.remove(INSIGHT_ORDERFLOW_THEME_CLASS);
    };
  }, []);

  /** Native Capacitor iOS: hide WKWebView keyboard accessory bar (prev/next/done). No-op on web/PWA. */
  useEffect(() => {
    void (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios')
          return;
        const { Keyboard } = await import('@capacitor/keyboard');
        await Keyboard.setAccessoryBarVisible({ isVisible: false });
      } catch {
        /* web build or plugin unavailable */
      }
    })();
  }, []);

  /**
   * Lock document scroll while the rooms search input is focused so the keyboard
   * does not let the page swipe under the fixed header (matches prior Insight behavior).
   */
  useEffect(() => {
    if (!roomsSearchFocused) return;

    const html = document.documentElement;
    const body = document.body;
    const scrollY =
      window.scrollY ||
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop;

    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverscroll: body.style.overscrollBehavior,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyWidth: body.style.width,
      bodyBackground: body.style.backgroundColor,
      htmlBackground: html.style.backgroundColor,
    };

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    const pageBg = getComputedStyle(html).getPropertyValue('--background').trim();
    if (pageBg) {
      html.style.backgroundColor = `hsl(${pageBg})`;
      body.style.backgroundColor = `hsl(${pageBg})`;
    }
    html.style.overscrollBehavior = 'none';
    body.style.overscrollBehavior = 'none';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.width = '100%';

    const preventTouchMove = (e: TouchEvent) => {
      e.preventDefault();
    };
    document.addEventListener('touchmove', preventTouchMove, {
      passive: false,
    });

    const preventWheel = (e: WheelEvent) => {
      e.preventDefault();
    };
    window.addEventListener('wheel', preventWheel, { passive: false });

    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      html.style.overscrollBehavior = prev.htmlOverscroll;
      body.style.overscrollBehavior = prev.bodyOverscroll;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.left = prev.bodyLeft;
      body.style.width = prev.bodyWidth;
      html.style.backgroundColor = prev.htmlBackground;
      body.style.backgroundColor = prev.bodyBackground;
      document.removeEventListener('touchmove', preventTouchMove);
      window.removeEventListener('wheel', preventWheel);
      window.scrollTo(0, scrollY);
    };
  }, [roomsSearchFocused]);

  const blurRoomsSearchKeyboard = useCallback(() => {
    roomsSearchInputRef.current?.blur();
  }, []);

  /** Settings detail title (used by detail-variant SettingsTopBar on phone/tablet). */
  const settingsSection = useMemo(
    () =>
      isSettings ? findSectionByPathname(location.pathname) : undefined,
    [isSettings, location.pathname],
  );

  /** ----- Classroom branch (unchanged) ----- */
  if (isClassroom) {
    return (
      <div className="min-h-screen bg-background flex w-full">
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <div className="relative flex min-h-0 w-full flex-1 flex-col bg-background">
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex flex-1 min-h-0 w-full max-w-[1400px] mx-auto pb-8 pt-0 gap-6 justify-center items-stretch md:px-6 max-md:px-0">
                <main
                  className={cn(
                    'flex w-full flex-1 min-h-0 flex-col gap-6 max-w-lg mx-auto md:max-w-[640px] md:mx-0 md:pl-0 md:pr-0',
                    'max-md:pl-[max(0.25rem,env(safe-area-inset-left))] max-md:pr-[max(0.25rem,env(safe-area-inset-right))]',
                  )}
                >
                  <div className="shrink-0">
                    <FeedComposerStrip
                      variant="feed"
                      behavior="fixed"
                      stripSurface="flat"
                      headerLayout="stretch"
                      fixedClassName={INSIGHT_FEED_COMPOSER_STRIP_FIXED_Z}
                    >
                      <div className="flex min-w-0 w-full items-center gap-2 pb-1">
                        <Link
                          to="/dashboard/insight"
                          className={cn(
                            'shrink-0 self-center rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-muted/25 hover:text-foreground',
                            INSIGHT_FOCUS_RING,
                          )}
                          aria-label="Back to Insight"
                        >
                          <ArrowLeft className="h-5 w-5" aria-hidden />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            Classroom
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            Video lessons &amp; courses
                          </p>
                        </div>
                        <GraduationCap
                          className="h-5 w-5 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                      </div>
                    </FeedComposerStrip>
                  </div>
                  <div
                    className={cn(
                      'flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain',
                      compactNav
                        ? 'pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+var(--keyboard-inset,0px)+4.5rem))]'
                        : 'pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+var(--keyboard-inset,0px)+1.5rem))]',
                    )}
                    style={
                      {
                        '--keyboard-inset': `${feedColumnKeyboardInsetPx}px`,
                      } as React.CSSProperties
                    }
                  >
                    <InsightClassroomView />
                  </div>
                </main>
              </div>
            </div>
          </div>
        </div>
        {compactNav ? (
          <>
            <InsightLiquidGlassBackdropFilter aspectWidthOverHeight={10.5} />
            <PsBottomNav
              variant="embedded"
              slim
              embeddedNavigationAriaLabel="Insight mobile tools"
            />
          </>
        ) : null}
      </div>
    );
  }

  /** ----- Settings branch ----- */
  if (isSettings) {
    const isDesktop = surface === 'desktop';
    const isDetail = !!settingsSection && !isDesktop;
    /** Wider canvas on desktop so the master/detail two-pane breathes. */
    const mainWidthClass = isDesktop
      ? 'flex w-full flex-1 min-h-0 flex-col gap-0 max-w-[960px] mx-auto md:mx-0 md:pl-0 md:pr-0'
      : 'flex w-full flex-1 min-h-0 flex-col gap-0 max-w-lg mx-auto md:max-w-[640px] md:mx-0 md:pl-0 md:pr-0';

    return (
      <div className="min-h-screen bg-background flex w-full">
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <div className="relative flex min-h-0 w-full flex-1 flex-col bg-background">
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex flex-1 min-h-0 w-full max-w-[1400px] mx-auto pb-8 pt-0 gap-6 justify-center items-stretch md:px-6 max-md:px-0">
                <main
                  className={cn(
                    mainWidthClass,
                    'max-md:pl-[max(0.25rem,env(safe-area-inset-left))] max-md:pr-[max(0.25rem,env(safe-area-inset-right))]',
                  )}
                >
                  <div className="shrink-0">
                    <FeedComposerStrip
                      variant="feed"
                      behavior="fixed"
                      stripSurface="flat"
                      headerLayout="stretch"
                      fixedClassName={INSIGHT_FEED_COMPOSER_STRIP_FIXED_Z}
                    >
                      <SettingsTopBar
                        variant={isDetail ? 'detail' : 'index'}
                        title={settingsSection?.label}
                      />
                    </FeedComposerStrip>
                  </div>
                  <div
                    className={cn(
                      'flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain',
                      compactNav
                        ? 'pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+var(--keyboard-inset,0px)+4.5rem))]'
                        : 'pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+var(--keyboard-inset,0px)+1.5rem))]',
                    )}
                    style={
                      {
                        '--keyboard-inset': `${feedColumnKeyboardInsetPx}px`,
                      } as React.CSSProperties
                    }
                  >
                    <InsightSettingsView />
                  </div>
                </main>
              </div>
            </div>
          </div>
        </div>
        {compactNav ? (
          <>
            <InsightLiquidGlassBackdropFilter aspectWidthOverHeight={10.5} />
            <PsBottomNav
              variant="embedded"
              slim
              embeddedNavigationAriaLabel="Insight mobile tools"
            />
          </>
        ) : null}
      </div>
    );
  }

  /** ----- Discover OR Joined Rooms (shared shell with toggling header icon) ----- */
  const headerSearchPlaceholder = isRooms
    ? 'Search chats'
    : 'Search rooms, providers, #tags';
  const headerToggleTo = isRooms
    ? '/dashboard/insight'
    : '/dashboard/insight/rooms';
  const headerToggleLabel = isRooms ? 'Discover rooms' : 'Open My Rooms';

  return (
    <div className="min-h-screen bg-background flex w-full">
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <div className="relative flex min-h-0 w-full flex-1 flex-col bg-background">
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex flex-1 min-h-0 w-full max-w-[1400px] mx-auto pb-8 pt-0 gap-6 justify-center items-stretch md:px-6 max-md:px-0">
              <main
                className={cn(
                  'flex w-full flex-1 min-h-0 flex-col gap-0 max-w-lg mx-auto md:max-w-[640px] md:mx-0 md:pl-0 md:pr-0',
                  'max-md:pl-[max(0.25rem,env(safe-area-inset-left))] max-md:pr-[max(0.25rem,env(safe-area-inset-right))]',
                )}
              >
                <div className="shrink-0">
                  <FeedComposerStrip
                    variant="feed"
                    behavior="fixed"
                    stripSurface="flat"
                    headerLayout="stretch"
                    fixedClassName={INSIGHT_FEED_COMPOSER_STRIP_FIXED_Z}
                  >
                    <div className="flex min-w-0 w-full items-center gap-2 pb-1">
                      <span className="shrink-0 select-none text-lg font-semibold tracking-tight text-foreground">
                        Insight
                      </span>
                      <div className="relative min-w-0 flex-1">
                        <form
                          autoComplete="off"
                          noValidate
                          onSubmit={(e) => {
                            e.preventDefault();
                            blurRoomsSearchKeyboard();
                          }}
                          className="contents"
                        >
                          <div
                            className={cn(
                              'relative min-w-0 min-h-0 w-full overflow-hidden rounded-full',
                              roomsSearchPillRevealPlay &&
                                'orderflow-search-pill-reveal',
                            )}
                            onAnimationEnd={(e) => {
                              if (
                                e.animationName === 'orderflow-search-pill-reveal'
                              ) {
                                setRoomsSearchPillRevealPlay(false);
                              }
                            }}
                          >
                            <div className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-muted-foreground">
                              <SearchIcon className="h-4 w-4" aria-hidden />
                            </div>
                            <input
                              ref={roomsSearchInputRef}
                              type="search"
                              name="insight_rooms_search"
                              inputMode="search"
                              enterKeyHint="search"
                              value={roomsSearch}
                              onChange={(e) => setRoomsSearch(e.target.value)}
                              onFocus={() => {
                                setRoomsSearchFocused(true);
                                setRoomsSearchPillRevealPlay(true);
                              }}
                              onBlur={() => setRoomsSearchFocused(false)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  blurRoomsSearchKeyboard();
                                }
                              }}
                              placeholder={headerSearchPlaceholder}
                              autoComplete="off"
                              autoCorrect="off"
                              autoCapitalize="off"
                              spellCheck={false}
                              className={cn(
                                'w-full rounded-full border border-border/80 bg-muted/50 py-2.5 pl-9 text-[15px] text-foreground',
                                'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-0 dark:bg-muted/40',
                                'transition-[padding] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
                                '[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none',
                                roomsSearch ? 'pr-12' : 'pr-4',
                              )}
                              aria-label={
                                isRooms ? 'Search chats' : 'Search rooms'
                              }
                            />
                            {roomsSearch ? (
                              <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setRoomsSearch('');
                                  roomsSearchInputRef.current?.focus();
                                }}
                                className={cn(
                                  'absolute right-1 top-1/2 z-[1] -translate-y-1/2 rounded-full px-2 py-1 text-xs font-medium text-muted-foreground',
                                  'hover:bg-muted/40 hover:text-foreground',
                                  INSIGHT_FOCUS_RING,
                                )}
                                aria-label="Clear search"
                              >
                                Clear
                              </button>
                            ) : null}
                          </div>
                        </form>
                      </div>
                      {/**
                       * Gradient defs for the chrome icon (blue -> purple, matches sidebar avatar).
                       * Defined once here; the lucide icon below references it via stroke="url(#…)".
                       */}
                      <svg
                        width="0"
                        height="0"
                        aria-hidden
                        focusable="false"
                        style={{
                          position: 'absolute',
                          width: 0,
                          height: 0,
                          overflow: 'hidden',
                        }}
                      >
                        <defs>
                          <linearGradient
                            id="insight-chrome-icon-gradient"
                            x1="0"
                            y1="0"
                            x2="1"
                            y2="1"
                          >
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#9333ea" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <InsightComposeRoomHeaderButton />
                      <Link
                        to={headerToggleTo}
                        className={cn(
                          'inline-flex shrink-0 items-center justify-center rounded-full border border-border/70 bg-muted/40 p-2.5 transition-colors duration-200 ease-out',
                          'hover:bg-muted/25',
                          INSIGHT_FOCUS_RING,
                          'touch-manipulation [-webkit-tap-highlight-color:transparent]',
                        )}
                        aria-label={headerToggleLabel}
                      >
                        {isRooms ? (
                          <Compass
                            className="h-6 w-6 shrink-0"
                            color="url(#insight-chrome-icon-gradient)"
                            strokeWidth={1.75}
                            aria-hidden
                          />
                        ) : (
                          <MessageCircle
                            className="h-6 w-6 shrink-0 -scale-x-100"
                            color="url(#insight-chrome-icon-gradient)"
                            fill="url(#insight-chrome-icon-gradient)"
                            strokeWidth={1.5}
                            aria-hidden
                          />
                        )}
                      </Link>
                    </div>
                  </FeedComposerStrip>
                </div>

                <div
                  className={cn(
                    'flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain',
                    compactNav
                      ? 'pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+var(--keyboard-inset,0px)+4.5rem))]'
                      : 'pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+var(--keyboard-inset,0px)+1.5rem))]',
                  )}
                  style={
                    {
                      '--keyboard-inset': `${feedColumnKeyboardInsetPx}px`,
                    } as React.CSSProperties
                  }
                >
                  {isRooms ? (
                    <InsightJoinedRooms search={roomsSearch} />
                  ) : (
                    <InsightDiscoverRooms search={roomsSearch} />
                  )}
                </div>
              </main>
            </div>
          </div>
        </div>
      </div>
      {compactNav ? (
        <>
          <InsightComposeRoomFab />
          <InsightLiquidGlassBackdropFilter aspectWidthOverHeight={10.5} />
          <PsBottomNav
            variant="embedded"
            slim
            embeddedNavigationAriaLabel="Insight mobile tools"
          />
        </>
      ) : null}
    </div>
  );
}
