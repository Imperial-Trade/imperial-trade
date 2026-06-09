import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { MessageBubble, type MessageGroupPos } from "./MessageBubble";
import { TypingIndicator } from "@/components/pattern-stream/indicators/TypingIndicator";
import { PsSkeletonChatMessage } from "@/components/pattern-stream/indicators/PsSkeleton";
import { InsightChatMessageListSkeleton } from "@/insight/InsightChatMessageSkeleton";
import type { ChatMessage } from "@/hooks/pattern-stream/useRoomMessages";
import type { AggregatedReaction } from "@/hooks/pattern-stream/useMessageReactions";
import type { RoomSignal } from "@/hooks/pattern-stream/types";

export interface MessageAuthorMeta {
  name?: string;
  avatarUrl?: string | null;
  isProvider?: boolean;
}

export type InitialScrollIntent = "latest" | "top" | "message";

export type MessageListHandle = {
  scrollToLatest: () => void;
};

interface MessageListProps {
  /** Resets scroll anchors when switching rooms. */
  roomId?: string;
  messages: ChatMessage[];
  selfId: string | null;
  authors: Record<string, MessageAuthorMeta>;
  reactionsByMessage: Record<string, AggregatedReaction[]>;
  loading?: boolean;
  hasMore?: boolean;
  onLoadOlder?: () => void;
  onReact?: (messageId: string, emoji: string) => void;
  onReply?: (message: ChatMessage) => void;
  onStartEdit?: (message: ChatMessage) => void;
  editingMessageId?: string | null;
  onDelete?: (message: ChatMessage, scope: "self" | "all") => void;
  onRetry?: (message: ChatMessage) => void;
  canDeleteAll?: boolean;
  typingUsers?: string[];
  /** Flat Insight copy + typing caption when opened from Insight. */
  surface?: "pattern" | "insight" | "orderflowComments";
  /** Orderflow `/?comments=1` scroll column — nested `overflow-y-auto` + `space-y-6` + thread keyboard inset. */
  threadKeyboardInsetPx?: number;
  /** Blur composer keyboard when the user interacts with the message list (Orderflow thread modal). */
  onScrollInteraction?: () => void;
  /** Insight open scroll: latest (caught up), top (all unread in page), or anchor message (last read). */
  initialScrollIntent?: InitialScrollIntent;
  initialScrollMessageId?: string;
  onReachedBottom?: () => void;
  onAtBottomChange?: (atBottom: boolean) => void;
  /** When false, defer open scroll until unread plan is resolved (Insight). */
  initialScrollReady?: boolean;
  /** Live room_signals keyed by id for chat signal cards. */
  signalsById?: Record<string, RoomSignal>;
  signalCardSurface?: "pattern" | "insight";
  canPostSignal?: boolean;
  onManageSignal?: (signalId: string) => void;
  roomBrandName?: string;
}

/** Within this gap, two messages from the same sender are considered part of one run. */
const SAME_RUN_GAP_MS = 7 * 60 * 1000;
/** Pattern Stream surface keeps the legacy 120px near-bottom threshold. */
const NEAR_BOTTOM_PX_PATTERN = 120;
/** Insight surfaces use a tighter threshold so we don't yank the user when reading. */
const NEAR_BOTTOM_PX_INSIGHT = 64;

/** Signal updates are system rows with `user_id` null — treat provider as sender. */
function resolveMessageIsSelf(
  message: ChatMessage,
  selfId: string | undefined,
  signalsById?: Record<string, RoomSignal>,
): boolean {
  if (!selfId) return false;
  if (message.user_id === selfId) return true;
  if (
    message.signal_id &&
    signalsById?.[message.signal_id]?.provider_id === selfId
  ) {
    return true;
  }
  return false;
}

function resolveSignalProvider(
  message: ChatMessage,
  signalsById: Record<string, RoomSignal> | undefined,
  authors: Record<string, MessageAuthorMeta>,
  roomBrandName?: string,
): { name?: string; avatarUrl?: string | null; isProvider?: boolean } {
  if (!message.signal_id || !signalsById?.[message.signal_id]) {
    return { name: roomBrandName, isProvider: true };
  }
  const providerId = signalsById[message.signal_id].provider_id;
  const author = authors[providerId];
  return {
    name: author?.name ?? roomBrandName,
    avatarUrl: author?.avatarUrl,
    isProvider: author?.isProvider ?? true,
  };
}

function isScrollerAtBottom(el: HTMLElement, thresholdPx = 12, endMarker?: HTMLElement | null) {
  const composerTop = getComposerTopPx();
  if (composerTop != null && endMarker) {
    return endMarker.getBoundingClientRect().bottom <= composerTop - COMPOSER_CLEARANCE_PX + thresholdPx;
  }
  return el.scrollHeight - el.scrollTop - el.clientHeight <= thresholdPx;
}

function scrollMessageAboveComposer(el: HTMLElement, messageEl: HTMLElement) {
  const composerTop = getComposerTopPx();
  const targetBottom =
    (composerTop ?? el.getBoundingClientRect().bottom) - COMPOSER_CLEARANCE_PX;

  for (let i = 0; i < 16; i += 1) {
    const rect = messageEl.getBoundingClientRect();
    const scrollerTop = el.getBoundingClientRect().top;

    if (rect.bottom > targetBottom) {
      el.scrollTop += rect.bottom - targetBottom;
      continue;
    }
    if (rect.top < scrollerTop + 8) {
      el.scrollTop -= scrollerTop + 8 - rect.top;
    }
    break;
  }
}

const INSIGHT_COMPOSER_SELECTOR = '[aria-label="Messages"]';
const COMPOSER_CLEARANCE_PX = 8;

function getComposerTopPx(): number | null {
  if (typeof document === "undefined") return null;
  const composer = document.querySelector(INSIGHT_COMPOSER_SELECTOR);
  if (!(composer instanceof HTMLElement)) return null;
  return composer.getBoundingClientRect().top;
}

function scrollScrollerToLatest(
  el: HTMLElement,
  endMarker?: HTMLElement | null,
  lastMessageId?: string | null,
) {
  el.scrollTop = Math.max(0, el.scrollHeight - el.clientHeight);

  const composerTop = getComposerTopPx();
  const canScrollInternally = el.scrollHeight > el.clientHeight + 1;

  if (lastMessageId) {
    const msgEl = el.querySelector(`[data-message-id="${lastMessageId}"]`);
    if (msgEl instanceof HTMLElement) {
      if (!canScrollInternally) {
        msgEl.scrollIntoView({ block: "end", behavior: "instant" });
        return;
      }
    }
  }

  if (composerTop == null) return;

  const targetBottom = composerTop - COMPOSER_CLEARANCE_PX;

  if (lastMessageId) {
    const msgEl = el.querySelector(`[data-message-id="${lastMessageId}"]`);
    if (msgEl instanceof HTMLElement) {
      scrollMessageAboveComposer(el, msgEl);
      return;
    }
  }

  const anchor = endMarker;

  if (anchor) {
    for (let i = 0; i < 16; i += 1) {
      const bottom = anchor.getBoundingClientRect().bottom;
      if (bottom <= targetBottom) break;
      el.scrollTop += bottom - targetBottom;
    }
    return;
  }

  const overlap = el.getBoundingClientRect().bottom - targetBottom;
  if (overlap > 0) {
    el.scrollTop += overlap;
  }
}

function isLatestMessageSettled(
  el: HTMLElement,
  lastMessageId: string | null,
  thresholdPx: number,
  endMarker?: HTMLElement | null,
): boolean {
  const composerTop = getComposerTopPx();
  if (composerTop == null) return false;

  const targetBottom = composerTop - COMPOSER_CLEARANCE_PX;

  if (lastMessageId) {
    const msgEl = el.querySelector(`[data-message-id="${lastMessageId}"]`);
    if (msgEl instanceof HTMLElement) {
      const rect = msgEl.getBoundingClientRect();
      const scrollerTop = el.getBoundingClientRect().top;
      return (
        rect.bottom <= targetBottom + thresholdPx &&
        rect.top >= scrollerTop - thresholdPx
      );
    }
  }

  return isScrollerAtBottom(el, thresholdPx, endMarker);
}

export const MessageList = forwardRef<MessageListHandle, MessageListProps>(function MessageList(
  {
  roomId,
  messages,
  selfId,
  authors,
  reactionsByMessage,
  loading,
  hasMore,
  onLoadOlder,
  onReact,
  onReply,
  onStartEdit,
  editingMessageId,
  onDelete,
  onRetry,
  canDeleteAll,
  typingUsers = [],
  surface = "pattern",
  threadKeyboardInsetPx = 0,
  onScrollInteraction,
  initialScrollIntent = "latest",
  initialScrollMessageId,
  onReachedBottom,
  onAtBottomChange,
  initialScrollReady = true,
  signalsById,
  signalCardSurface = "pattern",
  canPostSignal,
  onManageSignal,
  roomBrandName,
  },
  ref,
) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const endMarkerRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | null>(null);
  const prevFirstIdRef = useRef<string | null>(null);
  const prevScrollHeightRef = useRef(0);
  const wasNearBottom = useRef(true);
  const initialScrollCompleteRef = useRef(false);
  const openPinActiveRef = useRef(false);
  const openPinKeyRef = useRef<string | null>(null);
  const reachedBottomNotifiedRef = useRef(false);

  const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;

  const isOrderflowComments = surface === "orderflowComments";
  const isInsightLike = surface === "insight" || isOrderflowComments;
  const nearBottomPx = isInsightLike ? NEAR_BOTTOM_PX_INSIGHT : NEAR_BOTTOM_PX_PATTERN;
  const bubbleSurface = isInsightLike ? "insight" : "pattern";

  const notifyBottomState = useCallback(
    (el: HTMLElement) => {
      const atBottom = isLatestMessageSettled(
        el,
        lastMessageId,
        nearBottomPx,
        endMarkerRef.current,
      );
      onAtBottomChange?.(atBottom);
      if (atBottom && !reachedBottomNotifiedRef.current) {
        reachedBottomNotifiedRef.current = true;
        onReachedBottom?.();
      }
    },
    [lastMessageId, nearBottomPx, onAtBottomChange, onReachedBottom],
  );

  const scrollToLatestInView = useCallback(
    (el: HTMLElement) => {
      scrollScrollerToLatest(el, endMarkerRef.current, lastMessageId);
    },
    [lastMessageId],
  );

  const firstMessageId = messages[0]?.id ?? null;

  useImperativeHandle(
    ref,
    () => ({
      scrollToLatest: () => {
        const el = scrollRef.current;
        if (!el) return;
        wasNearBottom.current = true;
        scrollToLatestInView(el);
        notifyBottomState(el);
      },
    }),
    [notifyBottomState, scrollToLatestInView],
  );

  useLayoutEffect(() => {
    initialScrollCompleteRef.current = false;
    openPinActiveRef.current = false;
    openPinKeyRef.current = null;
    reachedBottomNotifiedRef.current = false;
    wasNearBottom.current = true;
    lastIdRef.current = null;
    prevFirstIdRef.current = null;
    prevScrollHeightRef.current = 0;
  }, [roomId]);

  /**
   * Pillar 1 — Messenger-style cluster computation + day separators for Insight surfaces.
   *
   * Two messages belong to the same run only when:
   *   - they're from the same `user_id`, AND
   *   - they're both clusterable types (text / media — signals & system messages
   *     stand alone so the rich card never gets pulled into a tight cluster shape),
   *     AND
   *   - their `created_at` are within {@link SAME_RUN_GAP_MS} of each other.
   *
   * Pattern Stream falls back to the old flat rendering (no grouping, no separators).
   */
  /**
   * Index of the most recent self-sent message in the thread. Used to gate the
   * Messenger-style "Sent / Delivered / Seen" caption so it only appears under
   * the very last outbound bubble rather than stacking under every one.
   */
  const latestSelfMessageId = useMemo(() => {
    if (!selfId) return null;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].user_id === selfId) return messages[i].id;
    }
    return null;
  }, [messages, selfId]);

  const rows = useMemo(() => {
    if (!isInsightLike) return null;
    const out: Array<
      | { kind: "day"; dayKey: string; label: string }
      | {
          kind: "msg";
          message: ChatMessage;
          groupPos: MessageGroupPos;
          showAvatar: boolean;
          showAuthor: boolean;
          showTimeBelow: boolean;
          topSpacingPx: number;
        }
    > = [];
    let prevDayKey: string | null = null;
    for (let i = 0; i < messages.length; i += 1) {
      const m = messages[i];
      const prev = messages[i - 1];
      const next = messages[i + 1];
      const canClusterCurrent = isClusterableType(m);
      const prevSame =
        !!prev &&
        canClusterCurrent &&
        isClusterableType(prev) &&
        prev.user_id === m.user_id &&
        new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < SAME_RUN_GAP_MS;
      const nextSame =
        !!next &&
        canClusterCurrent &&
        isClusterableType(next) &&
        next.user_id === m.user_id &&
        new Date(next.created_at).getTime() - new Date(m.created_at).getTime() < SAME_RUN_GAP_MS;
      let groupPos: MessageGroupPos;
      if (prevSame && nextSame) groupPos = "mid";
      else if (prevSame) groupPos = "tail";
      else if (nextSame) groupPos = "head";
      else groupPos = "single";

      const dayKey = startOfDayKey(m.created_at);
      const showDaySeparator = dayKey !== prevDayKey;
      if (showDaySeparator) {
        out.push({ kind: "day", dayKey, label: formatDayLabel(m.created_at) });
        prevDayKey = dayKey;
      }
      // Spacing: 2px inside a same-sender cluster (mb-0.5 feel),
      // 14px between clusters / different senders (close to mb-4 = 16px),
      // and 4px right under a day separator (the separator brings its own padding).
      const topSpacingPx = prevSame && !showDaySeparator ? 2 : showDaySeparator ? 4 : 14;
      out.push({
        kind: "msg",
        message: m,
        groupPos,
        showAvatar: groupPos === "single" || groupPos === "tail",
        showAuthor: groupPos === "single" || groupPos === "head",
        // Time below only at the END of a same-sender run (Messenger pattern).
        showTimeBelow: groupPos === "single" || groupPos === "tail",
        topSpacingPx,
      });
    }
    return out;
  }, [messages, isInsightLike]);

  /** Immediate bottom anchor when messages first paint (Messenger open). */
  useLayoutEffect(() => {
    if (loading || !initialScrollReady || initialScrollIntent !== "latest") return;
    const el = scrollRef.current;
    if (!el || !lastMessageId) return;
    wasNearBottom.current = true;
    scrollToLatestInView(el);
  }, [loading, initialScrollReady, initialScrollIntent, lastMessageId, roomId, scrollToLatestInView]);

  /** Opening a room: scroll per unread intent until layout settles. */
  useLayoutEffect(() => {
    if (loading || !roomId || !lastMessageId || !initialScrollReady) return;

    const openKey = `${roomId}:${lastMessageId}:${initialScrollIntent}:${initialScrollMessageId ?? ""}`;
    if (openPinKeyRef.current === openKey) return;

    const el = scrollRef.current;
    if (!el) return;

    openPinKeyRef.current = openKey;
    openPinActiveRef.current = true;
    initialScrollCompleteRef.current = false;
    wasNearBottom.current = initialScrollIntent === "latest";

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const pin = () => {
      if (cancelled) return;
      if (initialScrollIntent === "latest") {
        scrollToLatestInView(el);
      } else if (initialScrollIntent === "top") {
        el.scrollTop = 0;
        wasNearBottom.current = false;
      } else if (initialScrollIntent === "message" && initialScrollMessageId) {
        wasNearBottom.current = false;
        const msgEl = el.querySelector(`[data-message-id="${initialScrollMessageId}"]`);
        if (msgEl instanceof HTMLElement) {
          scrollMessageAboveComposer(el, msgEl);
        }
      }
    };

    const finishOpenPin = () => {
      if (cancelled) return;
      pin();
      openPinActiveRef.current = false;
      initialScrollCompleteRef.current = true;
      prevFirstIdRef.current = firstMessageId;
      lastIdRef.current = lastMessageId;
      prevScrollHeightRef.current = el.scrollHeight;
      notifyBottomState(el);
    };

    const scheduleLatestFinishPoll = (startedAt: number) => {
      pollTimer = window.setTimeout(() => {
        if (cancelled) return;
        pin();
        const settled = isLatestMessageSettled(
          el,
          lastMessageId,
          nearBottomPx,
          endMarkerRef.current,
        );
        const composerReady = getComposerTopPx() != null;
        if ((settled && composerReady) || performance.now() - startedAt >= 5000) {
          finishOpenPin();
          return;
        }
        scheduleLatestFinishPoll(startedAt);
      }, 50);
    };

    pin();
    requestAnimationFrame(() => {
      pin();
      requestAnimationFrame(pin);
    });

    const timers = [16, 50, 100, 200, 400, 700, 1000, 1500, 2000].map((ms) =>
      window.setTimeout(pin, ms),
    );

    if (initialScrollIntent === "latest") {
      scheduleLatestFinishPoll(performance.now());
    } else {
      pollTimer = window.setTimeout(finishOpenPin, 2100);
    }

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
      if (pollTimer != null) window.clearTimeout(pollTimer);
    };
  }, [
    loading,
    roomId,
    lastMessageId,
    firstMessageId,
    initialScrollIntent,
    initialScrollMessageId,
    initialScrollReady,
    nearBottomPx,
    notifyBottomState,
    scrollToLatestInView,
  ]);

  /** Late layout (authors, images) while still at the bottom — stay pinned. */
  useLayoutEffect(() => {
    if (loading || messages.length === 0) return;
    if (!wasNearBottom.current && !openPinActiveRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    scrollToLatestInView(el);
  }, [authors, loading, messages.length, reactionsByMessage, scrollToLatestInView]);

  /**
   * Coordinated scroll behavior:
   *  - If older messages were prepended (first id changed), preserve the user's viewport (audit C1).
   *  - If a new message was appended at the bottom AND the user was near the bottom, anchor to bottom.
   *  - If WE sent the latest message, always anchor to bottom regardless of position.
   */
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || messages.length === 0 || openPinActiveRef.current) return;
    const first = messages[0];
    const last = messages[messages.length - 1];
    const firstChanged =
      prevFirstIdRef.current !== null && first.id !== prevFirstIdRef.current;
    const lastChanged = last.id !== lastIdRef.current;

    if (firstChanged) {
      const heightDelta = el.scrollHeight - prevScrollHeightRef.current;
      if (heightDelta > 0) {
        el.scrollTop = el.scrollTop + heightDelta;
      }
    } else if (wasNearBottom.current || (lastChanged && last.user_id === selfId)) {
      scrollToLatestInView(el);
    }

    prevFirstIdRef.current = first.id;
    lastIdRef.current = last.id;
    prevScrollHeightRef.current = el.scrollHeight;
  }, [messages, selfId, scrollToLatestInView]);

  /**
   * Pillar 2 — Messenger-style keyboard anchoring. When the visual keyboard slides
   * in/out, or the composer grows/shrinks (which changes the scroller's clientHeight
   * via the composer-height CSS var or fixed-bottom layout), keep the latest
   * message anchored just above the composer if we were already near the bottom.
   */
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (openPinActiveRef.current || wasNearBottom.current) {
      scrollToLatestInView(el);
    }
  }, [threadKeyboardInsetPx, scrollToLatestInView]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let prevClientHeight = el.clientHeight;
    let prevScrollHeight = el.scrollHeight;
    const ro = new ResizeObserver(() => {
      const nextClientHeight = el.clientHeight;
      const nextScrollHeight = el.scrollHeight;
      const shouldAnchor =
        openPinActiveRef.current ||
        wasNearBottom.current ||
        (nextScrollHeight > prevScrollHeight &&
          (!initialScrollCompleteRef.current ||
            isScrollerAtBottom(el, nearBottomPx + 120, endMarkerRef.current)));
      if (
        (nextClientHeight !== prevClientHeight || nextScrollHeight !== prevScrollHeight) &&
        shouldAnchor
      ) {
        scrollScrollerToLatest(el, endMarkerRef.current, lastMessageId);
      }
      prevClientHeight = nextClientHeight;
      prevScrollHeight = nextScrollHeight;
    });
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    const composerFooter = document.querySelector('[aria-label="Messages"]');
    if (composerFooter instanceof HTMLElement) ro.observe(composerFooter);
    const lastMsgEl = lastMessageId
      ? el.querySelector(`[data-message-id="${lastMessageId}"]`)
      : null;
    if (lastMsgEl instanceof HTMLElement) ro.observe(lastMsgEl);
    return () => ro.disconnect();
  }, [nearBottomPx, lastMessageId]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const onChromeVarsChange = () => {
      if (!openPinActiveRef.current && !wasNearBottom.current) return;
      const el = scrollRef.current;
      if (!el) return;
      scrollToLatestInView(el);
    };
    const mo = new MutationObserver(onChromeVarsChange);
    mo.observe(root, { attributes: true, attributeFilter: ["style"] });
    return () => mo.disconnect();
  }, [scrollToLatestInView]);

  const dismissComposerOnContentInteraction = useCallback(() => {
    onScrollInteraction?.();
  }, [onScrollInteraction]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (openPinActiveRef.current) return;

    const atBottom = isLatestMessageSettled(
      el,
      lastMessageId,
      nearBottomPx,
      endMarkerRef.current,
    );
    wasNearBottom.current = atBottom;
    onAtBottomChange?.(atBottom);

    if (atBottom && !reachedBottomNotifiedRef.current) {
      reachedBottomNotifiedRef.current = true;
      onReachedBottom?.();
    }

    if (initialScrollCompleteRef.current && !openPinActiveRef.current && el.scrollTop < 48 && hasMore) {
      onLoadOlder?.();
    }
  };

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      onPointerDownCapture={
        onScrollInteraction ? dismissComposerOnContentInteraction : undefined
      }
      onTouchStart={onScrollInteraction ? dismissComposerOnContentInteraction : undefined}
      onWheelCapture={onScrollInteraction ? dismissComposerOnContentInteraction : undefined}
      data-insight-chat-scroll={isOrderflowComments ? "" : undefined}
      className={cn(
        isOrderflowComments
          ? "min-w-0 max-w-full min-h-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto overscroll-contain px-0 py-0"
          : "flex-1 min-h-0 overflow-y-auto",
      )}
      style={{
        ...(isOrderflowComments
          ? {
              WebkitOverflowScrolling: "touch",
              touchAction: "auto",
              paddingBottom:
                "max(1rem, calc(env(safe-area-inset-bottom) + var(--thread-keyboard-inset, 0px) + var(--orderflow-feed-comments-composer-height, 5.5rem) + 0.5rem))",
              ["--thread-keyboard-inset" as string]: `${threadKeyboardInsetPx}px`,
            }
          : {
              overscrollBehaviorY: "contain",
              ...(surface === "insight"
                ? {
                    paddingBottom:
                      "max(0.5rem, calc(env(safe-area-inset-bottom) + var(--thread-keyboard-inset, 0px) + var(--orderflow-feed-comments-composer-height, 5.5rem)))",
                    ["--thread-keyboard-inset" as string]: `${threadKeyboardInsetPx}px`,
                  }
                : {}),
            }),
      }}
    >
      <div
        className={cn(
          !isOrderflowComments && !isInsightLike && "flex flex-col gap-2 py-3",
          /*
           * Stitch reference: `<main class="px-margin-mobile">` = 16px gutters.
           * MessageBubble no longer adds its own `px-2`, so this wrapper owns
           * the entire horizontal margin: 16px mobile, 24px desktop. Outbound
           * bubbles sit flush against the right gutter via `ml-auto`.
           */
          isInsightLike && "flex flex-col py-4 px-4 md:px-6",
          isInsightLike && loading && "gap-3",
        )}
      >
        {loading &&
          (isInsightLike ? (
            <InsightChatMessageListSkeleton count={6} />
          ) : (
            Array.from({ length: 6 }).map((_, i) => (
              <PsSkeletonChatMessage
                key={i}
                index={i}
                side={i % 2 === 0 ? "inbound" : "outbound"}
              />
            ))
          ))}

        {!loading && messages.length === 0 && (
          <div
            className={cn(
              "py-10 text-center text-sm",
              (surface === "insight" || isOrderflowComments) && "text-muted-foreground",
            )}
            style={
              surface === "insight" || isOrderflowComments
                ? undefined
                : { color: "var(--ps-text-tertiary)", fontSize: 13 }
            }
          >
            No messages yet. Say hello.
          </div>
        )}

        {isInsightLike && rows
          ? rows.map((row, idx) => {
              if (row.kind === "day") {
                return <DaySeparator key={`day-${row.dayKey}`} label={row.label} surface={surface} />;
              }
              const m = row.message;
              const author = m.user_id ? authors[m.user_id] : undefined;
              const isSelf = resolveMessageIsSelf(m, selfId, signalsById);
              const parentMsg = m.parent_message_id
                ? messages.find((x) => x.id === m.parent_message_id)
                : null;
              const parentPreview = parentMsg
                ? {
                    authorName: parentMsg.user_id ? authors[parentMsg.user_id]?.name : undefined,
                    text: (parentMsg.content as { text?: string })?.text,
                  }
                : null;

              return (
                <div
                  key={m.id}
                  data-message-id={m.id}
                  style={{ marginTop: idx === 0 ? 0 : row.topSpacingPx }}
                >
                  <MessageBubble
                    message={m}
                    isSelf={isSelf}
                    isProvider={author?.isProvider}
                    authorName={author?.name}
                    authorAvatarUrl={author?.avatarUrl}
                    reactions={reactionsByMessage[m.id] ?? []}
                    onReact={(emoji) => onReact?.(m.id, emoji)}
                    onReply={onReply}
                    onStartEdit={onStartEdit}
                    onDelete={onDelete}
                    onRetry={onRetry}
                    canDeleteAll={canDeleteAll}
                    parentPreview={parentPreview}
                    surface={bubbleSurface}
                    groupPos={row.groupPos}
                    showAvatar={row.showAvatar}
                    showAuthor={row.showAuthor}
                    showTimeBelow={row.showTimeBelow}
                    isLatestSelfMessage={m.id === latestSelfMessageId}
                    isBeingEdited={m.id === editingMessageId}
                    scrollerRef={scrollRef}
                    signalsById={signalsById}
                    signalCardSurface={signalCardSurface}
                    canPostSignal={canPostSignal}
                    onManageSignal={onManageSignal}
                    roomId={roomId}
                    roomBrandName={roomBrandName}
                    signalProvider={resolveSignalProvider(
                      m,
                      signalsById,
                      authors,
                      roomBrandName,
                    )}
                  />
                </div>
              );
            })
          : messages.map((m) => {
              const author = m.user_id ? authors[m.user_id] : undefined;
              const isSelf = resolveMessageIsSelf(m, selfId, signalsById);
              const parentMsg = m.parent_message_id
                ? messages.find((x) => x.id === m.parent_message_id)
                : null;
              const parentPreview = parentMsg
                ? {
                    authorName: parentMsg.user_id ? authors[parentMsg.user_id]?.name : undefined,
                    text: (parentMsg.content as { text?: string })?.text,
                  }
                : null;

              return (
                <div key={m.id} data-message-id={m.id}>
                  <MessageBubble
                  message={m}
                  isSelf={isSelf}
                  isProvider={author?.isProvider}
                  authorName={author?.name}
                  authorAvatarUrl={author?.avatarUrl}
                  reactions={reactionsByMessage[m.id] ?? []}
                  onReact={(emoji) => onReact?.(m.id, emoji)}
                  onReply={onReply}
                  onStartEdit={onStartEdit}
                  onDelete={onDelete}
                  onRetry={onRetry}
                  canDeleteAll={canDeleteAll}
                  parentPreview={parentPreview}
                  isBeingEdited={m.id === editingMessageId}
                    scrollerRef={scrollRef}
                    signalsById={signalsById}
                    signalCardSurface={signalCardSurface}
                    canPostSignal={canPostSignal}
                    onManageSignal={onManageSignal}
                    roomId={roomId}
                    roomBrandName={roomBrandName}
                    signalProvider={resolveSignalProvider(
                      m,
                      signalsById,
                      authors,
                      roomBrandName,
                    )}
                  />
                </div>
              );
            })}

        {typingUsers.length > 0 && (
          <div className={cn(isInsightLike ? "px-2 pt-4" : "px-3")}>
            {isInsightLike ? (
              <TypingIndicator
                surface="insight"
                caption={
                  typingUsers.length === 1
                    ? `${typingUsers[0] ?? "Someone"} is typing…`
                    : `${typingUsers.length} people are typing…`
                }
              />
            ) : (
              <>
                <TypingIndicator />
                <div
                  className="mt-1 text-[11px]"
                  style={{ fontSize: 11, color: "var(--ps-text-tertiary)", marginTop: 4 }}
                >
                  {typingUsers.length === 1 ? "Someone is typing..." : `${typingUsers.length} typing...`}
                </div>
              </>
            )}
          </div>
        )}
        <div ref={endMarkerRef} aria-hidden className="h-px w-full shrink-0" />
      </div>
    </div>
  );
});

function DaySeparator({
  label,
  surface,
}: {
  label: string;
  surface: "pattern" | "insight" | "orderflowComments";
}) {
  if (surface === "insight" || surface === "orderflowComments") {
    return (
      <div className="flex items-center justify-center py-4" aria-hidden>
        <span className="ps-insight-day-pill">{label}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center py-3" aria-hidden>
      <span className="rounded-full bg-muted/40 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

/**
 * Only text and media bubbles participate in same-sender clustering. Signal cards
 * and system messages always render as their own row so a rich signal card never
 * inherits the "fused" tight-corner cluster shape from neighboring text bubbles.
 */
function isClusterableType(m: ChatMessage): boolean {
  return m.type === "text" || m.type === "media";
}

function startOfDayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (isSameDay(d, today)) return "Today";
  if (isSameDay(d, yesterday)) return "Yesterday";
  const sameYear = d.getFullYear() === today.getFullYear();
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}
