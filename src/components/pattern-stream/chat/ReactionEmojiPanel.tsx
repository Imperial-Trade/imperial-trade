import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import { MagnifyingGlass, CaretDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  getRecentReactionEmojis,
  pushRecentReactionEmoji,
} from "@/utils/recentReactionEmojis";
import {
  REACTION_EMOJI_CATEGORIES,
  RECENT_CATEGORY,
  type ReactionEmojiCategoryId,
} from "./reactionEmojiCatalog";
import { searchReactionEmojis } from "./emojiSearchIndex";

interface ReactionEmojiPanelProps {
  onPick: (emoji: string) => void;
  onClose: () => void;
}

const SWIPE_PAGE_THRESHOLD_PX = 40;
const SWIPE_VELOCITY_THRESHOLD = 320;

/** Snappy horizontal page slide — x only. */
const PAGE_SLIDE_TRANSITION = {
  type: "tween" as const,
  duration: 0.2,
  ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
};

interface PagerPage {
  id: ReactionEmojiCategoryId;
  label: string;
  emojis: string[];
}

function EmojiCell({
  emoji,
  onPick,
}: {
  emoji: string;
  onPick: (emoji: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(emoji)}
      className="flex aspect-square w-9 shrink-0 items-center justify-center rounded-lg text-[22px] transition-transform duration-75 active:scale-[0.82] hover:bg-white/10 sm:w-10"
      role="listitem"
      aria-label={`React ${emoji}`}
    >
      {emoji}
    </button>
  );
}

export function ReactionEmojiPanel({ onPick, onClose }: ReactionEmojiPanelProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [recentEmojis, setRecentEmojis] = useState(() => getRecentReactionEmojis());
  const gridAreaRef = useRef<HTMLDivElement>(null);
  const pageWidthRef = useRef(0);
  const pageIndexRef = useRef(pageIndex);
  const trackX = useMotionValue(0);
  const dragGestureRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    startTrackX: 0,
    axis: null as "x" | "y" | null,
    lastX: 0,
    lastT: 0,
    velocityX: 0,
  });

  pageIndexRef.current = pageIndex;

  const pagerPages = useMemo<PagerPage[]>(
    () => [
      { id: "recent", label: "Recent", emojis: recentEmojis },
      ...REACTION_EMOJI_CATEGORIES.map((cat) => ({
        id: cat.id,
        label: cat.label,
        emojis: cat.emojis,
      })),
    ],
    [recentEmojis],
  );

  const pageCount = pagerPages.length;
  const currentPage = pagerPages[pageIndex] ?? pagerPages[0];

  const categories = useMemo(() => {
    const recent = { ...RECENT_CATEGORY, emojis: recentEmojis };
    return [recent, ...REACTION_EMOJI_CATEGORIES];
  }, [recentEmojis]);

  const searchResults = useMemo(() => {
    const q = search.trim();
    if (!q) return [];
    return searchReactionEmojis(q);
  }, [search]);

  const isSearching = search.trim().length > 0;

  const snapTrackToPage = useCallback(
    (idx: number, behavior: "animate" | "instant" = "animate") => {
      const w = pageWidthRef.current || gridAreaRef.current?.clientWidth || 0;
      if (w <= 0) return;
      const target = -idx * w;
      if (behavior === "instant") {
        trackX.set(target);
        return;
      }
      void animate(trackX, target, PAGE_SLIDE_TRANSITION);
    },
    [trackX],
  );

  const goToPage = useCallback(
    (nextIndex: number) => {
      const clamped = Math.min(pageCount - 1, Math.max(0, nextIndex));
      if (clamped === pageIndexRef.current) {
        snapTrackToPage(clamped);
        return;
      }
      if (clamped === 0) {
        setRecentEmojis(getRecentReactionEmojis());
      }
      setPageIndex(clamped);
      snapTrackToPage(clamped);
    },
    [pageCount, snapTrackToPage],
  );

  /** Measure viewport width and keep the track aligned to the active page. */
  useEffect(() => {
    if (isSearching) return;
    const el = gridAreaRef.current;
    if (!el) return;

    const applyWidth = () => {
      const w = el.clientWidth;
      if (w <= 0) return;
      pageWidthRef.current = w;
      trackX.set(-pageIndexRef.current * w);
    };

    applyWidth();
    const ro = new ResizeObserver(applyWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isSearching, trackX]);

  useEffect(() => {
    if (pageIndex === 0 && !isSearching) {
      setRecentEmojis(getRecentReactionEmojis());
    }
  }, [pageIndex, isSearching]);

  const handlePick = useCallback(
    (emoji: string) => {
      pushRecentReactionEmoji(emoji);
      setRecentEmojis(getRecentReactionEmojis());
      onPick(emoji);
    },
    [onPick],
  );

  const selectCategory = useCallback(
    (id: ReactionEmojiCategoryId) => {
      setSearch("");
      const idx = pagerPages.findIndex((p) => p.id === id);
      if (idx >= 0) goToPage(idx);
    },
    [goToPage, pagerPages],
  );

  const handleDragEnd = useCallback(
    (offsetX: number, velocityX: number) => {
      const w = pageWidthRef.current || gridAreaRef.current?.clientWidth || 0;
      if (w <= 0) return;

      let idx = pageIndexRef.current;

      if (offsetX <= -SWIPE_PAGE_THRESHOLD_PX || velocityX <= -SWIPE_VELOCITY_THRESHOLD) {
        idx = Math.min(pageCount - 1, pageIndexRef.current + 1);
      } else if (offsetX >= SWIPE_PAGE_THRESHOLD_PX || velocityX >= SWIPE_VELOCITY_THRESHOLD) {
        idx = Math.max(0, pageIndexRef.current - 1);
      }

      goToPage(idx);
    },
    [goToPage, pageCount],
  );

  /** Pointer-driven horizontal paging — works both directions; vertical scroll when axis is Y. */
  useEffect(() => {
    if (isSearching) return;
    const el = gridAreaRef.current;
    if (!el) return;

    const AXIS_LOCK = 8;

    const resetGesture = () => {
      dragGestureRef.current.pointerId = -1;
      dragGestureRef.current.axis = null;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const g = dragGestureRef.current;
      g.pointerId = e.pointerId;
      g.startX = e.clientX;
      g.startY = e.clientY;
      g.startTrackX = trackX.get();
      g.axis = null;
      g.lastX = e.clientX;
      g.lastT = performance.now();
      g.velocityX = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      const g = dragGestureRef.current;
      if (g.pointerId !== e.pointerId) return;

      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;

      if (!g.axis) {
        if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) return;
        g.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (g.axis === "x") {
          el.setPointerCapture(e.pointerId);
        }
      }

      if (g.axis === "x") {
        e.preventDefault();
        const w = pageWidthRef.current || el.clientWidth;
        if (w <= 0) return;
        const minX = -w * (pageCount - 1);
        const maxX = 0;
        const next = Math.min(maxX, Math.max(minX, g.startTrackX + dx));
        trackX.set(next);

        const now = performance.now();
        const dt = now - g.lastT;
        if (dt > 0) {
          g.velocityX = ((e.clientX - g.lastX) / dt) * 1000;
        }
        g.lastX = e.clientX;
        g.lastT = now;
      }
    };

    const onPointerEnd = (e: PointerEvent) => {
      const g = dragGestureRef.current;
      if (g.pointerId !== e.pointerId) return;

      if (g.axis === "x") {
        const dx = e.clientX - g.startX;
        handleDragEnd(dx, g.velocityX);
        if (el.hasPointerCapture(e.pointerId)) {
          el.releasePointerCapture(e.pointerId);
        }
      }

      resetGesture();
    };

    el.addEventListener("pointerdown", onPointerDown, { capture: true });
    el.addEventListener("pointermove", onPointerMove, { capture: true, passive: false });
    el.addEventListener("pointerup", onPointerEnd, { capture: true });
    el.addEventListener("pointercancel", onPointerEnd, { capture: true });

    return () => {
      el.removeEventListener("pointerdown", onPointerDown, { capture: true });
      el.removeEventListener("pointermove", onPointerMove, { capture: true });
      el.removeEventListener("pointerup", onPointerEnd, { capture: true });
      el.removeEventListener("pointercancel", onPointerEnd, { capture: true });
    };
  }, [isSearching, pageCount, trackX, handleDragEnd]);

  const tabActiveId = isSearching ? null : currentPage?.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: 12, height: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="w-full overflow-hidden"
      style={{
        background: "var(--insight-surface-bg)",
        border: "1px solid var(--insight-glass-border)",
        borderRadius: 18,
        boxShadow: "0 24px 48px -16px rgba(0,0,0,0.45), 0 8px 16px -8px rgba(0,0,0,0.3)",
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      role="dialog"
      aria-label="Emoji reactions"
    >
      <div className="border-b px-3 py-2.5" style={{ borderColor: "var(--insight-glass-border)" }}>
        <label className="relative flex items-center">
          <MagnifyingGlass
            size={16}
            className="pointer-events-none absolute left-3 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Emoji"
            className={cn(
              "w-full rounded-full border-0 py-2 pl-9 pr-3 text-sm outline-none",
              "bg-background/30 text-foreground placeholder:text-muted-foreground",
              "focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-0",
            )}
          />
        </label>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {isSearching ? (
          <motion.div
            key="search-results"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.16 }}
            className={cn(
              "max-h-[min(38vh,220px)] overflow-y-auto overscroll-contain px-2 py-2",
              "[-ms-overflow-style:none] [scrollbar-width:thin]",
            )}
            role="list"
            aria-label="Search results"
          >
            {searchResults.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                No emojis found for &ldquo;{search.trim()}&rdquo;
              </p>
            ) : (
              <div className="flex flex-wrap gap-0.5">
                {searchResults.map((emoji, idx) => (
                  <EmojiCell key={`${emoji}-${idx}`} emoji={emoji} onPick={handlePick} />
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="category-browse"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.16 }}
          >
            <div
              ref={gridAreaRef}
              className="relative h-[min(38vh,220px)] w-full overflow-hidden select-none"
              style={{ touchAction: "manipulation" }}
              aria-label="Swipe left or right for emoji categories"
            >
              <motion.div
                className="flex h-full"
                style={{
                  x: trackX,
                  width: `${pageCount * 100}%`,
                  willChange: "transform",
                }}
              >
                {pagerPages.map((page) => (
                  <div
                    key={page.id}
                    className={cn(
                      "h-full shrink-0 overflow-y-auto overflow-x-hidden overscroll-y-contain px-2 py-2",
                      "[-ms-overflow-style:none] [scrollbar-width:thin]",
                    )}
                    style={{
                      width: `${100 / pageCount}%`,
                    }}
                    role="list"
                    aria-label={page.label}
                    aria-hidden={page.id !== currentPage.id}
                  >
                    {page.emojis.length === 0 ? (
                      <p className="px-2 py-8 text-center text-xs text-muted-foreground">
                        {page.id === "recent"
                          ? "No recent emojis yet — react to save them here"
                          : "No emojis in this category"}
                      </p>
                    ) : (
                      <div className="grid grid-cols-8 gap-0.5">
                        {page.emojis.map((emoji, idx) => (
                          <EmojiCell key={`${page.id}-${emoji}-${idx}`} emoji={emoji} onPick={handlePick} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="flex items-center gap-0.5 border-t px-1.5 py-1.5"
        style={{ borderColor: "var(--insight-glass-border)" }}
      >
        <div
          className={cn(
            "flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto",
            "touch-pan-x scroll-smooth",
            "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          )}
        >
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = !isSearching && tabActiveId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => selectCategory(cat.id)}
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                  isActive
                    ? "bg-white/12 text-foreground"
                    : "text-muted-foreground hover:bg-white/8 hover:text-foreground",
                )}
                aria-label={cat.label}
                aria-current={isActive ? "true" : undefined}
              >
                <Icon size={18} weight={isActive ? "fill" : "regular"} />
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          aria-label="Close emoji panel"
        >
          <CaretDown size={18} weight="bold" />
        </button>
      </div>
    </motion.div>
  );
}
