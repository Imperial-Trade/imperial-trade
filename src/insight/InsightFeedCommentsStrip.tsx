import { useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, List, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ORDERFLOW_FEED_STRIP_HEIGHT_CSS_VAR,
  orderflowFeedComposerStripInnerColumnClass,
  orderflowGlassBackdropClassName,
} from "@/insight/orderflowChrome";

export interface InsightHeaderMemberFace {
  avatarUrl?: string | null;
  initial?: string;
}

export interface InsightFeedCommentsStripProps {
  onBack: () => void;
  /** Primary line (room name, or replaced by “Reply” when `replyActive`). */
  primaryTitle: string;
  /** Fallback letter in the avatar circle when `avatarUrl` is absent. */
  avatarInitial: string;
  /** Optional room avatar image. */
  avatarUrl?: string | null;
  /** Green (active member) or grey (muted/pending/etc.) presence dot on avatar; `false` hides. */
  presence?: "active" | "inactive" | false;
  /** Reply mode: primary line shows “Reply”. */
  replyActive?: boolean;
  /** Second line under “Reply” (e.g. parent message preview). */
  replySubtitle?: string | null;
  /** Active member count — shown under room title (Stitch header row). */
  activeMemberCount?: number;
  /** Up to 3 overlapping member faces beside the active count. */
  activeMemberAvatars?: InsightHeaderMemberFace[];
  /** Room sub-nav drawer open — toggles trailing menu ↔ close control. */
  roomNavOpen?: boolean;
  onToggleRoomNav?: () => void;
  /** Second row inside fixed header chrome (room tabs, etc.). */
  headerExtension?: ReactNode;
  /** Messenger-style in-conversation search. */
  searchActive?: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  /** Chat: float header over messages — no in-flow spacer, translucent chrome. */
  overlayHeader?: boolean;
}

/**
 * Fixed feed strip (`z-30`, `md:right-[4.5rem]`) — Orderflow chrome with **room profile** row:
 * back · avatar (with optional presence dot) · title (+ reply preview when replying).
 */
export function InsightFeedCommentsStrip({
  onBack,
  primaryTitle,
  avatarInitial,
  avatarUrl,
  presence = false,
  replyActive = false,
  replySubtitle,
  activeMemberCount,
  activeMemberAvatars,
  roomNavOpen = false,
  onToggleRoomNav,
  headerExtension,
  searchActive = false,
  searchQuery = "",
  onSearchQueryChange,
  overlayHeader = false,
}: InsightFeedCommentsStripProps) {
  const measureRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    const el = measureRef.current;
    if (!el) return;
    const varName = ORDERFLOW_FEED_STRIP_HEIGHT_CSS_VAR;
    const apply = () => {
      const h = Math.max(1, Math.ceil(el.getBoundingClientRect().height));
      document.documentElement.style.setProperty(varName, `${h}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty(varName);
    };
  }, [
    primaryTitle,
    avatarUrl,
    replyActive,
    replySubtitle,
    presence,
    activeMemberCount,
    activeMemberAvatars,
    searchActive,
    searchQuery,
    roomNavOpen,
    headerExtension,
  ]);

  useLayoutEffect(() => {
    if (!searchActive) return;
    const t = window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [searchActive]);

  const line1 = replyActive ? "Reply" : primaryTitle;
  const replyLine =
    replyActive && (replySubtitle?.trim() ?? "") ? replySubtitle!.trim() : null;
  const memberFaces = (activeMemberAvatars ?? []).slice(0, 3);
  const showActiveRow =
    !replyActive && activeMemberCount != null && activeMemberCount >= 0;

  const fixedChrome = (
    <div
      ref={measureRef}
      data-feed-header-chrome
      className={cn(
        "feed-header-chrome isolate fixed z-30 top-0 left-0 right-0 md:right-[4.5rem]",
        overlayHeader
          ? cn(
              "border-b border-border/25 bg-transparent",
              "supports-[backdrop-filter]:bg-background/15 supports-[backdrop-filter]:backdrop-blur-xl supports-[backdrop-filter]:backdrop-saturate-150",
            )
          : cn(
              orderflowGlassBackdropClassName,
              "border-b border-border/50",
              "bg-background/95 supports-[backdrop-filter]:backdrop-blur-md",
            ),
        "pt-[max(0rem,env(safe-area-inset-top))]",
      )}
    >
      <div className={orderflowFeedComposerStripInnerColumnClass}>
        <div className="flex min-w-0 w-full items-center gap-2 py-1">
          <button
            type="button"
            onClick={onBack}
            className="-ml-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-foreground opacity-90 transition-colors hover:bg-muted/50 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-0"
            aria-label={searchActive ? "Close search" : "Back"}
          >
            <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden strokeWidth={2} />
          </button>

          {searchActive ? (
            <div className="flex min-w-0 flex-1 items-center">
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange?.(e.target.value)}
                placeholder="Search messages"
                enterKeyHint="search"
                className={cn(
                  "h-10 w-full min-w-0 rounded-full border border-border/50 bg-muted/40 px-4 text-[15px] text-foreground",
                  "placeholder:text-muted-foreground/70",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-0",
                )}
                aria-label="Search messages in this room"
              />
            </div>
          ) : (
            <>
              <div className="relative shrink-0">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full",
                    "bg-muted/60 text-sm font-semibold text-foreground ring-1 ring-border/60",
                  )}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span aria-hidden>{(avatarInitial || "?").charAt(0).toUpperCase()}</span>
                  )}
                </div>
                {presence === "active" ? (
                  <span
                    className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-500"
                    aria-hidden
                  />
                ) : presence === "inactive" ? (
                  <span
                    className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-muted-foreground/55 dark:bg-muted-foreground/50"
                    aria-hidden
                  />
                ) : null}
              </div>

              <div
                className={cn(
                  "flex min-w-0 flex-1 flex-col justify-center py-0.5",
                  replyLine ? "gap-0.5" : "gap-0",
                )}
              >
                <div className="truncate text-[15px] font-semibold leading-tight text-foreground">
                  {line1}
                </div>
                {replyLine ? (
                  <div className="truncate text-xs leading-tight text-muted-foreground">{replyLine}</div>
                ) : showActiveRow ? (
                  <div className="flex items-center gap-2 pt-0.5">
                    {memberFaces.length > 0 ? (
                      <div className="flex shrink-0 -space-x-1" aria-hidden>
                        {memberFaces.map((face, index) => (
                          <div
                            key={`${face.avatarUrl ?? face.initial ?? "m"}-${index}`}
                            className={cn(
                              "flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-full",
                              "border border-background bg-muted/70 text-[8px] font-semibold text-muted-foreground",
                              index === memberFaces.length - 1 &&
                                !face.avatarUrl &&
                                "bg-[var(--insight-gold-soft)]",
                            )}
                          >
                            {face.avatarUrl ? (
                              <img src={face.avatarUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span>{(face.initial ?? "?").charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      {activeMemberCount} Active
                    </span>
                  </div>
                ) : null}
              </div>
            </>
          )}

          {!searchActive && onToggleRoomNav ? (
            <button
              type="button"
              onClick={onToggleRoomNav}
              className="-mr-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-foreground opacity-90 transition-colors hover:bg-muted/50 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-0"
              aria-label={roomNavOpen ? "Close room menu" : "Open room menu"}
              aria-expanded={roomNavOpen}
            >
              {roomNavOpen ? (
                <X className="h-5 w-5 shrink-0" aria-hidden strokeWidth={2} />
              ) : (
                <List className="h-5 w-5 shrink-0" aria-hidden strokeWidth={2} />
              )}
            </button>
          ) : null}
        </div>

        {headerExtension ? (
          <div className="border-t border-border/50 pb-1.5 pt-1.5">
            {headerExtension}
          </div>
        ) : null}
      </div>
    </div>
  );

  const portaled =
    typeof document !== "undefined" ? createPortal(fixedChrome, document.body) : fixedChrome;

  return (
    <>
      {!overlayHeader ? (
        <div
          aria-hidden
          className="w-full shrink-0"
          style={{
            height: "var(--orderflow-feed-strip-height, 3.5rem)",
            minHeight: "3.5rem",
          }}
        />
      ) : null}
      {portaled}
    </>
  );
}
