/**
 * Canonical Insight design tokens — Discover wins.
 *
 * The Discover page (`InsightDiscoverRooms` + `InsightRoomCard`) is the source of truth for the
 * Insight visual language. Every other Insight surface (Joined Rooms, Settings, Classroom, future
 * pages) imports from this file so the chip palette, card surfaces, focus rings, and skeleton
 * tones stay perfectly aligned. Do not invent new card classes inline.
 */

/** Default Insight card surface (matches `InsightRoomCard` line 118). */
export const INSIGHT_CARD_CLASS =
  'rounded-2xl border border-border/60 bg-card/40 p-4 shadow-sm';

/** Same card family as above, with hairline row dividers (used by Settings groups). */
export const INSIGHT_CARD_GROUP_CLASS =
  'rounded-2xl border border-border/60 bg-card/40 divide-y divide-border/40 overflow-hidden';

/** Insight chip primitive — same proportions as Pattern Stream `.ps-chip`, neutral by default. */
export const insightChipBase =
  'inline-flex items-center gap-1.5 h-[22px] rounded-full border px-2.5 text-[12px] font-medium whitespace-nowrap';

/** Variant: neutral muted-foreground chip (default room metadata). */
export const insightChipNeutral =
  'border-border/60 bg-muted/40 text-muted-foreground';

/** Variant: yellow-green chip (paid / top performer). */
export const insightChipYellowGreen =
  'border-lime-400/40 bg-muted/40 text-lime-600 dark:text-lime-400';

/** Variant: emerald chip (joined / positive). */
export const insightChipGreen =
  'border-emerald-500/35 bg-muted/40 text-emerald-600 dark:text-emerald-400';

/** Variant: amber chip (pending / warning). */
export const insightChipWarning =
  'border-amber-500/40 bg-muted/40 text-amber-600 dark:text-amber-400';

/**
 * Neutral focus ring used everywhere on Insight (per
 * `.cursor/rules/imperial-rules.mdc`). Insight `--ring` is intentionally neutral, not the
 * primary cyan, so this class never reads as a blue/cyan halo.
 */
export const INSIGHT_FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-0';

/** Insight skeleton tones (primary blocks vs secondary blocks). */
export const INSIGHT_SKELETON_PRIMARY = 'bg-muted/60';
export const INSIGHT_SKELETON_SECONDARY = 'bg-muted/40';

/** Insight stat colors (match `InsightRoomCard` `StatCell`). */
export const INSIGHT_STAT_POSITIVE = 'text-emerald-600 dark:text-emerald-400';
export const INSIGHT_STAT_NEGATIVE = 'text-rose-600 dark:text-rose-400';

/** Insight avatar tile (`InsightRoomCard` line 124-128). */
export const INSIGHT_AVATAR_TILE_CLASS =
  'bg-muted/60 text-foreground ring-1 ring-border/60';
