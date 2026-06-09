import { cn } from '@/lib/utils';

/** Set on `document.documentElement` by `FeedComposerStrip` to size sticky rows below the bar (px). */
export const ORDERFLOW_FEED_STRIP_HEIGHT_CSS_VAR =
  '--orderflow-feed-strip-height';

/**
 * Imperial Insight: portaled `FeedComposerStrip` must sit above `WidgetSidebar` (`z-[105]`) and its
 * edge overlay (`z-[80]`). Orderflow home keeps default `z-30` (no competing left chrome). Stay below
 * mobile bottom chrome (`z-[1220]+`) and sheets (`z-[1250]+`).
 */
export const INSIGHT_FEED_COMPOSER_STRIP_FIXED_Z = 'z-[120]';

/**
 * Optional second fixed strip (e.g. portaled thread composer) so it does not overwrite the main feed strip height.
 */
export const ORDERFLOW_THREAD_COMPOSER_STRIP_HEIGHT_CSS_VAR =
  '--orderflow-thread-composer-strip-height';

/** Full-page comments (`/?comments=1`) desktop / iPad: fixed footer composer height → scroll `padding-bottom`. */
export const ORDERFLOW_FEED_COMMENTS_COMPOSER_HEIGHT_CSS_VAR =
  '--orderflow-feed-comments-composer-height';

/** In-flow reserve under the message list while the composer is `position: fixed`. */
export const insightChatComposerReserveHeightCss =
  'var(--orderflow-feed-comments-composer-height, 5.5rem)';

/**
 * Same blur + translucency stack as `FeedComposerStrip` (Following / Explore header).
 * Use for full-bleed drawer overlays so the feed shows through with glass, not a flat scrim.
 */
export const orderflowGlassBackdropClassName = cn(
  'bg-background/70 dark:bg-background/55',
  'supports-[backdrop-filter]:bg-background/50 dark:supports-[backdrop-filter]:bg-background/40',
  'backdrop-blur-xl backdrop-saturate-150'
);

/**
 * Feed comments (mobile): shared liquid-glass tint + shadows for collapsed pill, expanded composer,
 * and portaled thread `FeedComposerStrip` above the keyboard — same stack everywhere.
 */
export const orderflowFeedCommentsLiquidGlassTint = cn(
  'bg-background/32 dark:bg-background/18',
  'supports-[backdrop-filter]:bg-background/22 dark:supports-[backdrop-filter]:bg-background/12',
  'backdrop-blur-2xl backdrop-saturate-200 backdrop-brightness-105 dark:backdrop-brightness-110'
);

export const orderflowFeedCommentsLiquidGlassPillShadow =
  'shadow-[0_2px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.18)]';

export const orderflowFeedCommentsLiquidGlassExpandedShadow =
  'shadow-[0_4px_24px_rgba(0,0,0,0.06),0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]';

/**
 * Full-page / inline feed create-post strip: toolbar row (category + attachments + Post) —
 * same liquid-glass stack + rounded shell as `CommentThreadModal` full-page comments bar.
 */
export const feedComposeStripToolbarGlassClass = cn(
  'isolate w-full min-w-0 overflow-x-hidden rounded-2xl border-0',
  'p-1.5 sm:p-2',
  orderflowFeedCommentsLiquidGlassTint,
  orderflowFeedCommentsLiquidGlassExpandedShadow
);

/**
 * Bottom-fixed compose toolbar: `rounded-full` pill + comments-bar glass (matches “Add a comment…”).
 * Width stays column-sized via the parent `max-w-lg` / `640px` wrapper in `GlassPostComposer`.
 * Always `flex-nowrap` so the Post CTA and icon row stay on one row on narrow / A2HS viewports (no clipped wrap).
 */
export const feedHomeComposeBottomPillShellClass = cn(
  'isolate flex w-full min-w-0 flex-nowrap items-center justify-between gap-x-1.5 sm:gap-x-2',
  'rounded-full border-0',
  'min-h-[3rem] px-1.5 py-2 sm:min-h-0 sm:px-3 sm:py-2.5',
  orderflowFeedCommentsLiquidGlassTint,
  orderflowFeedCommentsLiquidGlassPillShadow,
  'transition-[background-color,box-shadow]',
  '[@media(hover:hover)]:bg-background/42 dark:[@media(hover:hover)]:bg-background/26',
  'supports-[backdrop-filter]:[@media(hover:hover)]:bg-background/30 dark:supports-[backdrop-filter]:[@media(hover:hover)]:bg-background/18'
);

/**
 * Same base stack as `CommentThreadModal` full-page comments “Add a comment…” pill.
 */
export const feedCommentsMobileBarGlassPillClass = cn(
  'isolate flex w-full min-w-0 items-center gap-2 rounded-full border-0 px-3 py-2.5 text-left text-sm',
  orderflowFeedCommentsLiquidGlassTint,
  orderflowFeedCommentsLiquidGlassPillShadow,
  'transition-[background-color,box-shadow]',
  '[@media(hover:hover)]:bg-background/42 dark:[@media(hover:hover)]:bg-background/26',
  'supports-[backdrop-filter]:[@media(hover:hover)]:bg-background/30 dark:supports-[backdrop-filter]:[@media(hover:hover)]:bg-background/18',
  'active:bg-background/48 dark:active:bg-background/32',
  'supports-[backdrop-filter]:active:bg-background/34 dark:supports-[backdrop-filter]:active:bg-background/22',
  'focus-visible:outline-none focus-visible:ring-0'
);

/** Collapsed pill footprint — matches comments bar. */
export const feedCommentsMobileBarGlassPillCollapsedClass = cn(
  feedCommentsMobileBarGlassPillClass,
  'box-border w-[min(50vw,12rem)] min-w-[min(50vw,12rem)] max-w-[min(50vw,12rem)] shrink-0 self-center',
  'min-h-[2.75rem] max-h-[2.75rem] items-center justify-center overflow-hidden'
);

/** Add-to-home-screen: slightly tighter padding on the collapsed comments pill (Orderflow). */
export const feedCommentsMobileBarGlassPillStandaloneClass = cn(
  'px-2.5 py-2 min-h-[2.5rem] max-h-[2.5rem]',
);

/** Expanded full-page comments composer shell (`CommentThreadModal` mobile). */
export const feedCommentsMobileBarGlassExpandedClass = cn(
  'isolate w-full min-w-0 overflow-x-hidden rounded-2xl border-0',
  'p-3 sm:p-3.5 min-h-[5rem]',
  orderflowFeedCommentsLiquidGlassTint,
  orderflowFeedCommentsLiquidGlassExpandedShadow
);

/** PWA standalone: slightly shorter expanded shell. */
export const feedCommentsMobileBarGlassExpandedStandaloneClass = 'min-h-[3.5rem] p-2.5 sm:p-3';

/** Shared slide timing for Insight virtual keyboard + composer lift. */
export const INSIGHT_VK_MOTION = {
  open: { duration: 0.36, ease: [0.22, 1, 0.36, 1] as const },
  exit: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
};

/** Message long-press actions scrim — shared token (full-screen overlay only). */
export const insightMessageActionsScrimClass =
  'bg-[rgba(0,0,0,0.42)] backdrop-blur-[14px] backdrop-saturate-[140%]';

/** Unified Insight chat input stack — same material as ReactionPicker pill. */
export const insightChatInputStackShellClass = cn(
  'liquid-glass insight-liquid-glass-context',
  'rounded-t-[18px] overflow-x-hidden',
  'shadow-[0_-4px_24px_rgba(0,0,0,0.18)]',
);

/** Composer strip inside the input stack (flush with keyboard well). */
export const insightChatInputStackComposerClass = cn(
  'liquid-glass insight-liquid-glass-context',
  'border-b border-white/10',
  'flex flex-col justify-center min-h-0 py-0.5',
);

/** Virtual keyboard sheet — Insight liquid glass (legacy standalone portal). */
export const insightVirtualKeyboardSheetGlassClass = cn(
  'isolate',
  insightChatInputStackShellClass,
);

/** When the bottom bar is lifted over the VKB — chromeless outer, same liquid glass as pill. */
export const feedCommentsMobileBarExpandedOverKeyboardClass = cn(
  'isolate w-full min-w-0 overflow-x-visible rounded-2xl border-0',
  'p-3 sm:p-3.5 min-h-0',
  orderflowFeedCommentsLiquidGlassTint,
  orderflowFeedCommentsLiquidGlassExpandedShadow
);

/**
 * Same inner column as Orderflow `FeedComposerStrip` (`FEED_COMPOSER_STRIP_INNER_COLUMN_CLASS`).
 * Used for Insight room “comments page” fixed header.
 */
export const orderflowFeedComposerStripInnerColumnClass = cn(
  'mx-auto w-full pb-1 pt-1',
  'max-w-lg max-lg:pl-[max(0.5rem,env(safe-area-inset-left))] max-lg:pr-[max(0.5rem,env(safe-area-inset-right))]',
  'lg:max-w-[640px] lg:px-6'
);

/**
 * `MobileBottomNavigation` comments composer slot — matches Orderflow `FEED_COMMENTS_COMPOSER_SLOT_BASE`.
 */
export const feedCommentsComposerSlotBaseClass = cn(
  'w-full min-w-0',
  'pl-[max(6px,env(safe-area-inset-left))]',
  'pr-[max(6px,env(safe-area-inset-right))]',
  'max-w-[min(100%,42rem)] mx-auto'
);

/**
 * Index `/?comments=1` inner column — `OrderflowSheetColumn` `commentsPage` variant.
 */
export const orderflowCommentsPageColumnClassName = cn(
  'pointer-events-auto flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden',
  'rounded-none border-0 bg-transparent shadow-none',
  'text-foreground'
);

/** Full-page create post (`/?compose=1`) top strip: transparent + hairline, like bottom tab shell. */
export const feedComposeLiquidAppBarChromeClass = cn(
  'feed-header-chrome isolate',
  'border-b border-border/40 bg-transparent shadow-none',
  'pt-[max(0rem,env(safe-area-inset-top))]'
);

/** Horizontal padding aligned with `MobileBottomNavigation` composer column. */
export const feedComposeLiquidAppBarInnerColumnClass = cn(
  'mx-auto w-full pb-1 pt-1',
  'max-w-lg max-lg:pl-[max(6px,env(safe-area-inset-left))] max-lg:pr-[max(6px,env(safe-area-inset-right))]',
  'lg:max-w-[640px] lg:px-6'
);

/** Post CTA in portaled feed strip on full-page compose — liquid glass pill + orange label. */
export const feedComposeStripPostPillClass = cn(
  feedCommentsMobileBarGlassPillCollapsedClass,
  'text-sm font-semibold text-orange-500 dark:text-orange-400'
);

/**
 * Post CTA in the **pinned** bottom glass row (compact inline / `/?compose=1`).
 * Narrow `w-auto` footprint so back + meta + icons fit without horizontal scroll on phones / A2HS.
 */
export const feedComposePinnedPostPillClass = cn(
  'isolate flex items-center justify-center rounded-full border-0 shrink-0',
  'min-h-[2.75rem] h-[2.75rem] px-3 sm:px-3.5',
  'w-auto min-w-[4.25rem] max-w-[6rem]',
  orderflowFeedCommentsLiquidGlassTint,
  orderflowFeedCommentsLiquidGlassPillShadow,
  'text-sm font-semibold text-orange-500 dark:text-orange-400',
  'transition-[background-color,box-shadow]',
  '[@media(hover:hover)]:bg-background/42 dark:[@media(hover:hover)]:bg-background/26',
  'supports-[backdrop-filter]:[@media(hover:hover)]:bg-background/30 dark:supports-[backdrop-filter]:[@media(hover:hover)]:bg-background/18',
  'active:bg-background/48 dark:active:bg-background/32',
  'supports-[backdrop-filter]:active:bg-background/34 dark:supports-[backdrop-filter]:active:bg-background/22',
  'focus-visible:outline-none focus-visible:ring-0'
);

/**
 * Profile page POSTS / SAVED / REPLIES — same liquid-glass pill stack as bottom create-post bar
 * (`feedHomeComposeBottomPillShellClass` / comments bar).
 */
export const profilePageTabsListGlassClass = cn(
  'isolate relative z-[1] mb-3 overflow-hidden',
  'rounded-full border-0',
  'p-1.5 sm:p-2',
  'min-h-[2.75rem]',
  'flex h-auto w-full min-w-0 flex-nowrap touch-manipulation items-stretch justify-stretch gap-0.5 sm:gap-1',
  orderflowFeedCommentsLiquidGlassTint,
  orderflowFeedCommentsLiquidGlassPillShadow,
  'transition-[background-color,box-shadow]',
  '[@media(hover:hover)]:bg-background/42 dark:[@media(hover:hover)]:bg-background/26',
  'supports-[backdrop-filter]:[@media(hover:hover)]:bg-background/30 dark:supports-[backdrop-filter]:[@media(hover:hover)]:bg-background/18',
  'text-muted-foreground'
);

/**
 * Standalone profile: tab pill with blur + minimal tint so feed content reads through when the strip is sticky.
 */
export const profilePageTabsListGlassSeeThroughClass = cn(
  // No horizontal scroll — triggers use flex-1 + clamp() labels so the pill always fits the column.
  'isolate relative z-[1] mb-0 overflow-hidden',
  'rounded-full border-0',
  // Match circular back control: h-11 (44px) liquid-glass row
  'h-11 min-h-11 max-h-11 box-border shrink-0 w-full min-w-0 max-w-full',
  // Inset track so active segment fill stays inside the pill (not flush with outer ring)
  'px-1 py-1 sm:px-1.5',
  'flex flex-nowrap touch-manipulation items-stretch justify-stretch gap-0.5 sm:gap-1',
  'backdrop-blur-2xl backdrop-saturate-200 backdrop-brightness-105 dark:backdrop-brightness-110',
  'bg-transparent supports-[backdrop-filter]:bg-background/10 dark:supports-[backdrop-filter]:bg-background/5',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
  'ring-1 ring-inset ring-white/25 dark:ring-white/10',
  'transition-[background-color,box-shadow]',
  '[@media(hover:hover)]:supports-[backdrop-filter]:bg-background/15 dark:[@media(hover:hover)]:supports-[backdrop-filter]:bg-background/10',
  'text-muted-foreground'
);

export const profilePageTabsTriggerGlassClass = cn(
  // Equal thirds of the pill; label size uses clamp() in Profile (fits narrow widths without scrolling).
  'relative flex h-full min-h-0 min-w-0 flex-1 basis-0 self-stretch items-center justify-center gap-0.5 rounded-full border-0 px-0.5 py-0 sm:gap-1.5 sm:px-1.5',
  'overflow-hidden',
  'z-0 data-[state=active]:z-[2] focus-visible:z-[3]',
  'whitespace-nowrap text-center',
  'transition-colors',
  // No outer shadow on active — avoids “halo” outside the rounded track
  'data-[state=active]:bg-background/55 data-[state=active]:text-foreground data-[state=active]:shadow-none',
  'dark:data-[state=active]:bg-white/12 dark:data-[state=active]:text-foreground',
  'disabled:opacity-40 disabled:grayscale'
);

/** Fluid uppercase labels + icons (vmin) so POSTS / SAVED / REPLIES fit without horizontal scroll. */
export const profilePageTabLabelClampClass = cn(
  'min-w-0 font-semibold tracking-tight leading-none',
  'uppercase',
  'text-[clamp(0.5rem,0.12rem+2.4vmin,0.8125rem)]'
);

export const profilePageTabIconClampClass = cn(
  'shrink-0',
  'size-[clamp(0.6875rem,0.5rem+0.75vmin,1rem)]'
);

/**
 * Standalone profile top notch + header: vertical fade — background at 100% opacity (top) → 0% (bottom).
 */
export const profileStandaloneHeaderGlassGradientClass = cn(
  'bg-[linear-gradient(to_bottom,hsl(var(--background)/1)_0%,hsl(var(--background)/0)_100%)]',
  'supports-[backdrop-filter]:backdrop-blur-xl supports-[backdrop-filter]:backdrop-saturate-150'
);
