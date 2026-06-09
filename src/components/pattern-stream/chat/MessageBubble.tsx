import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactionPicker } from "./ReactionPicker";
import { ReactionEmojiPanel } from "./ReactionEmojiPanel";
import { ReactionBar } from "./ReactionBar";
import { SystemMessage } from "./SystemMessage";
import { SignalUpdateMessage } from "./SignalUpdateMessage";
import type { RoomSignal } from "@/hooks/pattern-stream/types";
import { snapshotToRoomSignal } from "@/utils/roomSignalCardData";
import type { SignalCardData } from "./SignalCard";
import { RoomTradeAlertCard } from "@/components/pattern-stream/signals/RoomTradeAlertCard";
import { DeliveryTicks } from "@/components/pattern-stream/indicators/DeliveryTicks";
import type { ChatMessage } from "@/hooks/pattern-stream/useRoomMessages";
import type { AggregatedReaction } from "@/hooks/pattern-stream/useMessageReactions";
import { ArrowBendUpLeft, PencilSimple, Trash, DotsThreeVertical, CheckCircle, Check } from "@phosphor-icons/react";

/** Insight signal + update clusters share one fixed column width (not shrink-to-content). */
const INSIGHT_SIGNAL_CLUSTER_WIDTH = "w-[85%] max-w-[85%] min-w-0";
/** Photos render at ~2/3 of the text bubble width (no glass background). */
const INSIGHT_MEDIA_CLUSTER_WIDTH = "w-[57%] max-w-[57%] min-w-0";
const PATTERN_MEDIA_CLUSTER_WIDTH = "max-w-[52%] min-w-0";

const LONG_PRESS_MS = 280;
/** Cancel long-press if the pointer moves more than this many px from origin (audit C2). */
const LONG_PRESS_MOVE_TOLERANCE_PX = 8;
/** Reaction picker / context menu height envelope, used to flip below the bubble near top edge. */
const PICKER_HEADROOM_PX = 64;
/**
 * Quick-react palette shown beneath the action menu inside the Insight focal
 * modal — implemented via ReactionPicker (glass pill + expandable +).
 */
export type MessageGroupPos = "single" | "head" | "mid" | "tail";
export type MessageBubbleSurface = "pattern" | "insight" | "orderflowComments";

interface MessageBubbleProps {
  message: ChatMessage;
  isSelf: boolean;
  isProvider?: boolean;
  authorName?: string;
  authorAvatarUrl?: string | null;
  reactions?: AggregatedReaction[];
  onReact?: (emoji: string) => void;
  onReply?: (message: ChatMessage) => void;
  /** Opens composer edit mode for this message (Messenger-style — no inline editor). */
  onStartEdit?: (message: ChatMessage) => void;
  onDelete?: (message: ChatMessage, scope: "self" | "all") => void;
  onRetry?: (message: ChatMessage) => void;
  canDeleteAll?: boolean;
  parentPreview?: { authorName?: string; text?: string } | null;
  /** Visual surface — `insight` switches to Messenger/Telegram styling with in-bubble meta. */
  surface?: MessageBubbleSurface;
  /** Position within a same-sender run; controls bubble corner radii and avatar visibility. */
  groupPos?: MessageGroupPos;
  /** Render the author avatar gutter (only the last bubble of an inbound run shows the avatar). */
  showAvatar?: boolean;
  /** Render the author name + provider chip above the bubble (only the head of an inbound run). */
  showAuthor?: boolean;
  /** Render a time-below caption (only the tail of a same-sender run). */
  showTimeBelow?: boolean;
  /**
   * True only for the very last self-sent message in the thread — gates the
   * Messenger-style "Seen"/"Sent" status caption so it does not appear under
   * every outbound bubble.
   */
  isLatestSelfMessage?: boolean;
  /** True when this bubble's text is being edited in the composer. */
  isBeingEdited?: boolean;
  /** Scroll container ref used to decide whether to flip the picker BELOW the bubble (audit C3). */
  scrollerRef?: React.RefObject<HTMLElement | null>;
  /** Live signal rows keyed by signal_id (Insight chat). */
  signalsById?: Record<string, RoomSignal>;
  signalCardSurface?: "pattern" | "insight";
  canPostSignal?: boolean;
  onManageSignal?: (signalId: string) => void;
  roomId?: string;
  roomBrandName?: string;
  /** Provider meta for signal thread updates (card + status line). */
  signalProvider?: {
    name?: string;
    avatarUrl?: string | null;
    isProvider?: boolean;
  };
}

export function MessageBubble({
  message,
  isSelf,
  isProvider,
  authorName,
  authorAvatarUrl,
  reactions = [],
  onReact,
  onReply,
  onStartEdit,
  onDelete,
  onRetry,
  canDeleteAll,
  parentPreview,
  surface = "pattern",
  groupPos = "single",
  showAvatar = true,
  showAuthor = true,
  showTimeBelow = true,
  isLatestSelfMessage = false,
  isBeingEdited = false,
  scrollerRef,
  signalsById,
  signalCardSurface = "pattern",
  canPostSignal,
  onManageSignal,
  roomId,
  roomBrandName,
  signalProvider,
}: MessageBubbleProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [focalEmojiPanelOpen, setFocalEmojiPanelOpen] = useState(false);
  const [pickerAbove, setPickerAbove] = useState(true);
  /**
   * When the focal modal opens, we snapshot the live bubble's computed
   * background/color/border so the modal clone is visually identical
   * regardless of where the portal mounts in the DOM tree. CSS custom
   * properties don't inherit across React portals, and walking up to
   * the nearest `data-ps-root` ancestor was unreliable when multiple
   * theme providers stacked. Pulling the pixel values directly removes
   * that whole class of mismatches.
   */
  const [clonedBubbleStyle, setClonedBubbleStyle] = useState<{
    background: string;
    color: string;
    borderColor: string;
    boxShadow: string;
  } | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressOrigin = useRef<{ x: number; y: number } | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  /**
   * Pre-computed locale time string used by the Stitch meta-above row.
   * Must live before the early `system` / `signal` returns to satisfy
   * rules-of-hooks ordering.
   */
  const messageTimeLabel = useMemo(
    () => formatBubbleTime(message.created_at),
    [message.created_at],
  );

  const sendStatus =
    (message._send_status as "sending" | "sent" | "delivered" | "read" | "failed" | undefined) ??
    "sent";

  /**
   * Snapshot the live bubble styles right before the focal modal mounts.
   * Computed in an effect so we read the actual painted color, then the
   * portal renders the clone with the same `background/color/border` —
   * sidesteps CSS-custom-property inheritance issues across React portals.
   */
  useEffect(() => {
    const onInsightSurface = surface === "insight";
    if (!menuOpen || !onInsightSurface) {
      setClonedBubbleStyle(null);
      setFocalEmojiPanelOpen(false);
      return;
    }
    const el = bubbleRef.current;
    if (!el) return;
    const computed = window.getComputedStyle(el);
    setClonedBubbleStyle({
      background: computed.backgroundColor,
      color: computed.color,
      borderColor: computed.borderTopColor,
      boxShadow: computed.boxShadow,
    });
  }, [menuOpen, surface]);

  // Close picker / menu on outside tap.
  useEffect(() => {
    if (!pickerOpen && !menuOpen) return;
    const close = (e: Event) => {
      const target = e.target as Element | null;
      // The focal modal portal owns its own tap-to-close on the backdrop;
      // skip the global listener so a tap on a menu item or reaction
      // doesn't race its onClick handler before it can fire.
      if (target?.closest("[data-bubble-focal]")) return;
      setPickerOpen(false);
      setMenuOpen(false);
    };
    const t = window.setTimeout(() => {
      window.addEventListener("pointerdown", close, { once: true });
    }, 50);
    return () => window.clearTimeout(t);
  }, [pickerOpen, menuOpen]);

  /**
   * Decide whether the floating reaction picker / context menu should render BELOW
   * the bubble instead of above when this bubble is near the top edge of the
   * scroller. We re-evaluate on every long-press / menu open.
   */
  const computePickerSide = () => {
    const bubbleEl = bubbleRef.current;
    const scrollerEl = scrollerRef?.current;
    if (!bubbleEl) {
      setPickerAbove(true);
      return;
    }
    const bubbleRect = bubbleEl.getBoundingClientRect();
    const scrollTop = scrollerEl?.getBoundingClientRect().top ?? 0;
    const headroom = bubbleRect.top - scrollTop;
    setPickerAbove(headroom >= PICKER_HEADROOM_PX);
  };

  const startLongPress = (e: React.PointerEvent) => {
    longPressOrigin.current = { x: e.clientX, y: e.clientY };
    longPressTimer.current = window.setTimeout(() => {
      computePickerSide();
      /*
       * Insight surface: long-press goes STRAIGHT to the focal modal
       * (bubble + menu + inline reaction row). The floating reaction
       * picker is no longer used here — its emoji row was lifted into
       * the modal beneath the action menu so a single gesture exposes
       * everything.
       *
       * Pattern Stream (legacy) surface keeps the original two-step
       * flow: long-press → floating picker → "more" → menu.
       */
      const onInsight = surface === "insight";
      if (onInsight) {
        setMenuOpen(true);
      } else {
        setPickerOpen(true);
      }
      if ("vibrate" in navigator) navigator.vibrate?.(8);
    }, LONG_PRESS_MS);
  };

  /**
   * Audit C2: any noticeable movement (likely a scroll/swipe) should cancel the
   * long-press so the reaction picker does not pop while the user is scrolling.
   */
  const onLongPressMove = (e: React.PointerEvent) => {
    if (!longPressTimer.current || !longPressOrigin.current) return;
    const dx = Math.abs(e.clientX - longPressOrigin.current.x);
    const dy = Math.abs(e.clientY - longPressOrigin.current.y);
    if (dx > LONG_PRESS_MOVE_TOLERANCE_PX || dy > LONG_PRESS_MOVE_TOLERANCE_PX) {
      cancelLongPress();
    }
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    longPressOrigin.current = null;
  };

  const openMenu = () => {
    computePickerSide();
    setMenuOpen((v) => !v);
  };

  // Signal lifecycle thread (TP/SL/edit) — card cluster + centered status line
  if (message.type === "system" && message.signal_id) {
    const content = message.content as {
      signal_update_type?: string;
      value?: unknown;
    };
    const updateType = content.signal_update_type ?? "note";
    const signalRoomId = roomId ?? message.room_id;
    const threadSignal = message.signal_id ? signalsById?.[message.signal_id] : undefined;
    const providerName = signalProvider?.name ?? roomBrandName ?? "Provider";
    const insightLike =
      signalCardSurface === "insight" || surface === "insight" || surface === "orderflowComments";

    if (threadSignal && signalRoomId) {
      return (
        <motion.div
          layout
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className={cn(
            "flex w-full group",
            !insightLike && "px-2",
            isSelf ? "justify-end" : "justify-start",
          )}
        >
          <div
            className={cn(
              "flex items-end",
              insightLike ? INSIGHT_SIGNAL_CLUSTER_WIDTH : "max-w-[78%] min-w-0",
            )}
          >
            <div className="relative flex w-full min-w-0 flex-col gap-1">
              {insightLike && !isSelf && (
                <div
                  className="mb-0.5 flex items-center gap-2"
                  style={{ alignSelf: "flex-start" }}
                >
                  <div
                    className="flex shrink-0 items-center justify-center overflow-hidden"
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 9999,
                      background: "var(--insight-bubble-inbound-bg)",
                      border: "1px solid var(--insight-bubble-inbound-border)",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--ps-text)",
                      boxShadow: "var(--insight-bubble-shadow)",
                    }}
                  >
                    {signalProvider?.avatarUrl ? (
                      <img
                        src={signalProvider.avatarUrl}
                        alt=""
                        style={{ width: 24, height: 24, borderRadius: 9999, objectFit: "cover" }}
                      />
                    ) : (
                      <span>{providerName.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="ps-bubble__meta-author">{providerName}</span>
                  {signalProvider?.isProvider !== false && (
                    <span className="ps-bubble__meta-provider">· Provider</span>
                  )}
                </div>
              )}

              <RoomTradeAlertCard
                signal={threadSignal}
                roomId={signalRoomId}
                canManage={Boolean(canPostSignal && message.signal_id)}
                brandName={roomBrandName}
                authorName={providerName}
                authorAvatarUrl={signalProvider?.avatarUrl}
                isProvider={signalProvider?.isProvider ?? true}
                className="w-full min-w-0 max-w-full"
              />

              <SignalUpdateMessage
                updateType={updateType}
                value={content.value}
                signal={threadSignal}
                providerName={providerName}
                surface={surface}
                align={insightLike ? (isSelf ? "end" : "start") : "center"}
              />
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        layout
        className={cn(
          "flex w-full group",
          !insightLike && "px-2",
          isSelf ? "justify-end" : "justify-start",
        )}
      >
        <div
          className={cn(
            "flex items-end",
            insightLike ? INSIGHT_SIGNAL_CLUSTER_WIDTH : "max-w-[78%] min-w-0",
          )}
        >
          <SignalUpdateMessage
            updateType={updateType}
            value={content.value}
            signal={threadSignal}
            providerName={providerName}
            surface={surface}
            align={insightLike ? (isSelf ? "end" : "start") : "center"}
          />
        </div>
      </motion.div>
    );
  }

  // System message
  if (message.type === "system" && !message.signal_id) {
    const summary = (message.content as { summary?: string })?.summary ?? "Updated";
    const category = (message.content as { category?: string })?.category;
    return <SystemMessage summary={summary} category={category} />;
  }

  // Signal message — Trade Stream TradeAlertCard layout (live price, TP/SL, notes, close)
  const signalRoomId = roomId ?? message.room_id;
  if (message.type === "signal" && signalRoomId) {
    const snapshot = message.content as Partial<SignalCardData> & SignalCardData;
    const normalizedSnapshot: SignalCardData = {
      symbol: snapshot.symbol ?? "XAUUSD",
      side: snapshot.side ?? "buy",
      entry: Number(snapshot.entry ?? 0),
      sl: snapshot.sl == null ? null : Number(snapshot.sl),
      tps: Array.isArray(snapshot.tps) ? snapshot.tps : [],
      status: snapshot.status ?? "active",
      pips: Number(snapshot.pips ?? 0),
      notes: snapshot.notes,
    };
    const live = message.signal_id ? signalsById?.[message.signal_id] : undefined;
    const signalRow =
      live ??
      (message.signal_id
        ? snapshotToRoomSignal(message.signal_id, signalRoomId, normalizedSnapshot, message.created_at)
        : null);
    const insightLike = signalCardSurface === "insight" || surface === "insight" || surface === "orderflowComments";

    if (!signalRow) return null;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className={cn(
          "flex w-full group",
          !insightLike && "px-2",
          isSelf ? "justify-end" : "justify-start",
        )}
      >
        <div
          className={cn(
            "flex items-end",
            insightLike ? INSIGHT_SIGNAL_CLUSTER_WIDTH : "max-w-[78%] min-w-0",
          )}
        >
          <div
            className={cn(
              "flex min-w-0 flex-col relative w-full",
              insightLike && reactions.length > 0 ? "gap-2" : "gap-1",
            )}
          >
            {insightLike && showAuthor && !isSelf && (
              <div className="flex items-center gap-2 mb-0.5" style={{ alignSelf: "flex-start" }}>
                <div
                  className="flex-shrink-0 overflow-hidden flex items-center justify-center"
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 9999,
                    background: "var(--insight-bubble-inbound-bg)",
                    border: "1px solid var(--insight-bubble-inbound-border)",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--ps-text)",
                    boxShadow: "var(--insight-bubble-shadow)",
                  }}
                >
                  {authorAvatarUrl ? (
                    <img
                      src={authorAvatarUrl}
                      alt=""
                      style={{ width: 24, height: 24, borderRadius: 9999, objectFit: "cover" }}
                    />
                  ) : (
                    <span>{(authorName ?? "?").charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <span className="ps-bubble__meta-author">{authorName ?? "Member"}</span>
                {isProvider && <span className="ps-bubble__meta-provider">· Provider</span>}
              </div>
            )}

            <RoomTradeAlertCard
              signal={signalRow}
              roomId={signalRoomId}
              canManage={Boolean(canPostSignal && message.signal_id)}
              brandName={roomBrandName}
              authorName={authorName}
              authorAvatarUrl={authorAvatarUrl}
              isProvider={isProvider}
              className="w-full min-w-0 max-w-full"
            />

            {insightLike && (showTimeBelow || reactions.length > 0) && (
              <div
                className={cn(
                  "ps-bubble__meta-row flex max-w-full items-center gap-1.5",
                  isSelf ? "ml-auto self-end" : "self-start",
                )}
              >
                {isSelf && reactions.length > 0 && (
                  <div className="ps-bubble__meta-reactions ps-bubble__meta-reactions--outbound min-w-0">
                    <ReactionBar
                      reactions={reactions}
                      onToggle={(e) => onReact?.(e)}
                      surface="insight"
                      anchored
                      align="end"
                    />
                  </div>
                )}
                {showTimeBelow && (
                  <div className="shrink-0">
                    <InsightTimeBelow
                      time={messageTimeLabel}
                      align={isSelf ? "end" : "start"}
                      isSelf={isSelf}
                      status={isSelf && isLatestSelfMessage ? sendStatus : null}
                      onRetry={() => onRetry?.(message)}
                      inline
                    />
                  </div>
                )}
                {!isSelf && reactions.length > 0 && (
                  <div className="ps-bubble__meta-reactions ps-bubble__meta-reactions--inbound min-w-0">
                    <ReactionBar
                      reactions={reactions}
                      onToggle={(e) => onReact?.(e)}
                      surface="insight"
                      anchored
                      align="start"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  const text = (message.content as { text?: string })?.text ?? "";
  const isMedia = message.type === "media";
  const isInsight = surface === "insight";

  // Avatar gutter occupies space even when hidden so consecutive bubbles in a run line up.
  const showAvatarSlot = !isSelf;
  const showAvatarBubble = !isSelf && showAvatar;

  /*
   * Legacy Pattern-Stream avatar gutter (left of bubble).
   * Insight surface uses a 24px inline avatar in the meta-row above the
   * bubble (Stitch reference: SIGNAL_BOT / Alex T. clusters), so the
   * side gutter is suppressed for insight.
   */
  const avatarSizePx = 28;
  const showLegacyAvatarGutter = !isInsight && showAvatarSlot;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "flex w-full group",
        // Legacy Pattern-Stream surface keeps its 8px gutter; Insight relies
        // on MessageList's 16/24px wrapper padding to match Stitch.
        !isInsight && "px-2",
        isSelf ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "flex items-end",
          // Stitch: outbound cluster pushed to right via `ml-auto`, max 85% width.
          isMedia
            ? isInsight
              ? INSIGHT_MEDIA_CLUSTER_WIDTH
              : cn(PATTERN_MEDIA_CLUSTER_WIDTH, "gap-3")
            : isInsight
              ? "max-w-[85%]"
              : "max-w-[78%] gap-3",
        )}
      >
        {showLegacyAvatarGutter && (
          <div
            className="flex-shrink-0"
            style={{
              width: avatarSizePx,
              height: avatarSizePx,
              borderRadius: 9999,
              background: showAvatarBubble
                ? "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(255,255,255,0.06))"
                : "transparent",
              border: showAvatarBubble ? "1px solid var(--ps-border-subtle)" : "1px solid transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              color: "var(--ps-text)",
              overflow: "hidden",
              visibility: showAvatarBubble ? "visible" : "hidden",
            }}
            aria-hidden={!showAvatarBubble}
          >
            {authorAvatarUrl ? (
              <img
                src={authorAvatarUrl}
                alt=""
                style={{ width: avatarSizePx, height: avatarSizePx, borderRadius: 9999, objectFit: "cover" }}
              />
            ) : (
              <span>{(authorName ?? "?").charAt(0).toUpperCase()}</span>
            )}
          </div>
        )}

        <div
          className={cn(
            "flex flex-col relative",
            isInsight && reactions.length > 0 ? "gap-2" : "gap-1",
          )}
        >
          {/*
           * Above-bubble meta row — Stitch reference:
           *   <div class="flex items-center gap-2 mb-1">
           *     <div class="w-6 h-6 rounded-full">avatar</div>
           *     <span class="font-label-caps">SIGNAL_BOT</span>
           *   </div>
           *
           * Only inbound cluster HEADS get the row (`showAuthor`). Outbound
           * bubbles never carry a "Me" label or avatar — position + color
           * already identify them.
           */}
          {isInsight && showAuthor && !isSelf && !isMedia && (
            <div className="flex items-center gap-2 mb-0.5" style={{ alignSelf: "flex-start" }}>
              <div
                className="flex-shrink-0 overflow-hidden flex items-center justify-center"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 9999,
                  background: "var(--insight-bubble-inbound-bg)",
                  border: "1px solid var(--insight-bubble-inbound-border)",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--ps-text)",
                  boxShadow: "var(--insight-bubble-shadow)",
                }}
              >
                {authorAvatarUrl ? (
                  <img
                    src={authorAvatarUrl}
                    alt=""
                    style={{ width: 24, height: 24, borderRadius: 9999, objectFit: "cover" }}
                  />
                ) : (
                  <span>{(authorName ?? "?").charAt(0).toUpperCase()}</span>
                )}
              </div>
              <span className="ps-bubble__meta-author">{authorName ?? "Member"}</span>
              {isProvider && <span className="ps-bubble__meta-provider">· Provider</span>}
            </div>
          )}

          {!isInsight && !isSelf && showAuthor && authorName && (
            <span style={{ fontSize: 11, color: "var(--ps-text-tertiary)", paddingLeft: 4 }}>
              {authorName}
              {isProvider && (
                <span
                  className="ms-1"
                  style={{ color: "var(--ps-green)", fontSize: 11, fontWeight: 600 }}
                >
                  · Provider
                </span>
              )}
            </span>
          )}

          {parentPreview && (
            <div
              className="liquid-glass--inset px-2 py-1"
              style={{ borderRadius: 10, fontSize: 11, color: "var(--ps-text-tertiary)", maxWidth: 280 }}
            >
              <div style={{ color: "var(--ps-green)", fontWeight: 600 }}>
                {parentPreview.authorName ?? "Replying"}
              </div>
              <div className="truncate">{parentPreview.text ?? ""}</div>
            </div>
          )}

          {/*
           * Insight bubble — reactions render on the time-below row when present.
           */}
          <div
            ref={bubbleRef}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              startLongPress(e);
            }}
            onPointerMove={onLongPressMove}
            onPointerUp={cancelLongPress}
            onPointerLeave={cancelLongPress}
            onPointerCancel={cancelLongPress}
            className={cn(
              "ps-bubble",
              isSelf ? "ps-bubble--outbound" : "ps-bubble--inbound",
              isProvider && !isMedia && "ps-bubble--provider",
              isInsight && !isMedia && "ps-bubble--insight",
              isMedia && "ps-bubble--media",
              isInsight &&
                !isMedia &&
                (groupPos === "mid" || groupPos === "tail") &&
                "is-grouped-top",
              isInsight &&
                !isMedia &&
                (groupPos === "mid" || groupPos === "head") &&
                "is-grouped-bottom",
              isBeingEdited &&
                isInsight &&
                !isMedia &&
                "ring-2 ring-[var(--insight-gold)] ring-offset-2 ring-offset-transparent",
            )}
            style={{
              opacity: sendStatus === "failed" ? 0.7 : isBeingEdited ? 0.92 : 1,
              transition: "opacity 0.2s ease, box-shadow 0.2s ease",
            }}
          >
            {isMedia ? (
              <MediaContent content={message.content as Record<string, unknown>} />
            ) : isInsight ? (
              <span className="ps-bubble__body">{text}</span>
            ) : (
              <span style={{ whiteSpace: "pre-wrap" }}>{text}</span>
            )}
            {message.edited_at && (
              <span
                style={{
                  fontSize: 10,
                  color: isInsight ? "currentColor" : "var(--ps-text-tertiary)",
                  opacity: isInsight ? 0.6 : 1,
                  marginLeft: 6,
                }}
              >
                edited
              </span>
            )}
          </div>

          {/*
           * Below-bubble row — Pattern Stream only (delivery ticks + inline reactions).
           */}
          {!isInsight && (reactions.length > 0 || isSelf) && (
            <div
              className={cn(
                "flex items-center gap-1 justify-between",
              )}
            >
              <ReactionBar
                reactions={reactions}
                onToggle={(e) => onReact?.(e)}
                surface="pattern"
              />
              {isSelf && (
                <DeliveryTicks
                  status={sendStatus}
                  onRetry={() => onRetry?.(message)}
                />
              )}
            </div>
          )}

          {/*
           * Insight time-below caption (+ inline reactions when present).
           * - Renders only on cluster TAIL/SINGLE (`showTimeBelow`) — never per-bubble.
           * - Reactions sit on the same row: left of time (outbound) / right of time (inbound).
           */}
          {isInsight && (showTimeBelow || (!isMedia && reactions.length > 0)) && (
            <div
              className={cn(
                "ps-bubble__meta-row flex max-w-full items-center gap-1.5",
                isSelf ? "ml-auto self-end" : "self-start",
              )}
            >
              {isSelf && reactions.length > 0 && (
                <div className="ps-bubble__meta-reactions ps-bubble__meta-reactions--outbound min-w-0">
                  <ReactionBar
                    reactions={reactions}
                    onToggle={(e) => onReact?.(e)}
                    surface="insight"
                    anchored
                    align="end"
                    onPressAdd={() => setMenuOpen(true)}
                  />
                </div>
              )}
              {showTimeBelow && (
                <div className="shrink-0">
                  <InsightTimeBelow
                    time={messageTimeLabel}
                    align={isSelf ? "end" : "start"}
                    isSelf={isSelf}
                    status={isSelf && isLatestSelfMessage ? sendStatus : null}
                    onRetry={() => onRetry?.(message)}
                    inline
                  />
                </div>
              )}
              {!isSelf && reactions.length > 0 && (
                <div className="ps-bubble__meta-reactions ps-bubble__meta-reactions--inbound min-w-0">
                  <ReactionBar
                    reactions={reactions}
                    onToggle={(e) => onReact?.(e)}
                    surface="insight"
                    anchored
                    align="start"
                    onPressAdd={() => setMenuOpen(true)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Floating reaction picker */}
          {pickerOpen && (
            <div
              className="absolute"
              style={{
                ...(pickerAbove ? { top: -42 } : { bottom: -42 }),
                [isSelf ? "right" : "left"]: 0,
                zIndex: 30,
              }}
            >
              <ReactionPicker
                open={pickerOpen}
                onPick={(emoji) => {
                  onReact?.(emoji);
                  setPickerOpen(false);
                }}
                variant={isInsight ? "insight" : "pattern"}
              />
            </div>
          )}

          {/*
           * Legacy Pattern Stream inline anchored menu — kept for the
           * pattern surface only. Insight uses the focal modal portal below.
           */}
          {!isInsight && menuOpen && (
            <div
              className="liquid-glass absolute"
              style={{
                ...(pickerAbove
                  ? { top: -8, transform: "translateY(-100%)" }
                  : { bottom: -8, transform: "translateY(100%)" }),
                [isSelf ? "right" : "left"]: 0,
                zIndex: 30,
                padding: 4,
                minWidth: 180,
              }}
            >
              <MenuItem
                icon={<ArrowBendUpLeft size={14} />}
                label="Reply"
                onClick={() => {
                  onReply?.(message);
                  setMenuOpen(false);
                }}
              />
              {isSelf && !isMedia && (
                <MenuItem
                  icon={<PencilSimple size={14} />}
                  label="Edit"
                  onClick={() => {
                    onStartEdit?.(message);
                    setMenuOpen(false);
                  }}
                />
              )}
              {(isSelf || canDeleteAll) && (
                <MenuItem
                  icon={<Trash size={14} />}
                  label={isSelf ? "Delete for me" : "Delete for everyone"}
                  destructive
                  onClick={() => {
                    onDelete?.(message, isSelf ? "self" : "all");
                    setMenuOpen(false);
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/*
         * Insight focal modal — Messenger-style. When the menu opens, render
         * a portal with a blurred dim backdrop, a centered clone of the bubble
         * (the focal point), and the action menu beneath it. Tap backdrop to
         * close. Uses framer-motion springs for a bouncy bubble entrance and
         * a staggered menu fade-in so it feels unique to Insight (the gold
         * focal halo + the breath-in spring) rather than vanilla Messenger.
         */}
        {isInsight && typeof document !== "undefined" &&
          createPortal(
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  /*
                   * Re-apply the `data-ps-root` value (dark/light) from the
                   * bubble's ancestor onto the portal root. The portal mounts
                   * under `document.body`, escaping the `data-ps-root` wrapper
                   * on RoomLayout — without this, every `--insight-*` token
                   * inside the modal would resolve to nothing and the cloned
                   * bubble would lose its real background (white-inverted on
                   * dark, slate-900 on light). Computed at render time from
                   * the bubble ref so it always tracks the live theme.
                   */
                  data-ps-root={
                    bubbleRef.current
                      ?.closest("[data-ps-root]")
                      ?.getAttribute("data-ps-root") ?? "dark"
                  }
                  key={`bubble-focal-${message.id}`}
                  className="fixed inset-0 z-[1500] flex items-center justify-center p-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    background: "rgba(0, 0, 0, 0.42)",
                    WebkitBackdropFilter: "blur(14px) saturate(140%)",
                    backdropFilter: "blur(14px) saturate(140%)",
                  }}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Message actions"
                >
                  <motion.div
                    data-bubble-focal
                    initial={{ scale: 0.6, opacity: 0, y: 16 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.85, opacity: 0, y: 8 }}
                    transition={{ type: "spring", stiffness: 380, damping: 24, mass: 0.7 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative flex flex-col items-stretch gap-3 w-full"
                    style={{ maxWidth: 320 }}
                  >
                    {/* Gold focal halo behind the bubble */}
                    <motion.div
                      aria-hidden
                      className="absolute -inset-2 rounded-[28px] pointer-events-none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.08 }}
                      style={{
                        background:
                          "radial-gradient(60% 60% at 50% 30%, rgba(192,154,88,0.18), transparent 70%)",
                        filter: "blur(8px)",
                      }}
                    />

                    {/*
                     * Cloned bubble cluster — mirrors the original row so the
                     * focal modal bubble carries the SAME cluster corner shape
                     * (is-grouped-*), the SAME author meta row (inbound only),
                     * and the SAME time-below caption. The user-perceived
                     * bubble is then identical to the one in the chat thread.
                     */}
                    <div
                      className={cn(
                        "flex flex-col w-full gap-1",
                        isSelf ? "items-end" : "items-start",
                      )}
                    >
                      {showAuthor && !isSelf && !isMedia && (
                        <div className="flex items-center gap-2 mb-0.5">
                          <div
                            className="flex-shrink-0 overflow-hidden flex items-center justify-center"
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 9999,
                              background: "var(--insight-bubble-inbound-bg)",
                              border: "1px solid var(--insight-bubble-inbound-border)",
                              fontSize: 10,
                              fontWeight: 700,
                              color: "var(--ps-text)",
                              boxShadow: "var(--insight-bubble-shadow)",
                            }}
                          >
                            {authorAvatarUrl ? (
                              <img
                                src={authorAvatarUrl}
                                alt=""
                                style={{ width: 24, height: 24, borderRadius: 9999, objectFit: "cover" }}
                              />
                            ) : (
                              <span>{(authorName ?? "?").charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <span className="ps-bubble__meta-author">
                            {authorName ?? "Member"}
                          </span>
                          {isProvider && (
                            <span className="ps-bubble__meta-provider">· Provider</span>
                          )}
                        </div>
                      )}

                      <div
                        className={cn(
                          "ps-bubble relative",
                          !isMedia && "ps-bubble--insight",
                          isSelf ? "ps-bubble--outbound" : "ps-bubble--inbound",
                          isProvider && !isMedia && "ps-bubble--provider",
                          isMedia && "ps-bubble--media",
                          !isMedia && (groupPos === "mid" || groupPos === "tail") && "is-grouped-top",
                          !isMedia && (groupPos === "mid" || groupPos === "head") && "is-grouped-bottom",
                        )}
                        style={{
                          maxWidth: "100%",
                          ...(isMedia
                            ? {}
                            : /*
                               * `clonedBubbleStyle` is a snapshot of the live
                               * bubble's computed background/color/border taken
                               * the moment the modal opened.
                               */
                              (clonedBubbleStyle ?? {})),
                        }}
                      >
                        {isMedia ? (
                          <MediaContent content={message.content as Record<string, unknown>} />
                        ) : (
                          <span className="ps-bubble__body">{text}</span>
                        )}
                        {message.edited_at && (
                          <span
                            style={{
                              fontSize: 10,
                              color: "currentColor",
                              opacity: 0.6,
                              marginLeft: 6,
                            }}
                          >
                            edited
                          </span>
                        )}
                      </div>

                      <InsightTimeBelow
                        time={messageTimeLabel}
                        align={isSelf ? "end" : "start"}
                        isSelf={isSelf}
                        status={isSelf && isLatestSelfMessage && !isMedia ? sendStatus : null}
                      />
                    </div>

                    {/* Action menu BELOW the bubble */}
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ delay: 0.06, type: "spring", stiffness: 380, damping: 26 }}
                      className="overflow-hidden"
                      style={{
                        background: "var(--insight-surface-bg)",
                        border: "1px solid var(--insight-glass-border)",
                        borderRadius: 18,
                        padding: 6,
                        boxShadow:
                          "0 24px 48px -16px rgba(0,0,0,0.45), 0 8px 16px -8px rgba(0,0,0,0.3)",
                      }}
                    >
                      <FocalMenuItem
                        index={0}
                        icon={<ArrowBendUpLeft size={18} weight="bold" />}
                        label="Reply"
                        onClick={() => {
                          onReply?.(message);
                          setMenuOpen(false);
                        }}
                      />
                      {isSelf && !isMedia && (
                        <FocalMenuItem
                          index={1}
                          icon={<PencilSimple size={18} weight="bold" />}
                          label="Edit"
                          onClick={() => {
                            onStartEdit?.(message);
                            setMenuOpen(false);
                          }}
                        />
                      )}
                      {(isSelf || canDeleteAll) && (
                        <FocalMenuItem
                          index={isSelf ? 2 : 1}
                          icon={<Trash size={18} weight="bold" />}
                          label={isSelf ? "Delete for me" : "Delete for everyone"}
                          destructive
                          onClick={() => {
                            onDelete?.(message, isSelf ? "self" : "all");
                            setMenuOpen(false);
                          }}
                        />
                      )}
                    </motion.div>

                    {/* Full emoji panel — below action menu (Messenger-style) */}
                    <AnimatePresence>
                      {focalEmojiPanelOpen && (
                        <ReactionEmojiPanel
                          onPick={(emoji) => {
                            onReact?.(emoji);
                            setMenuOpen(false);
                          }}
                          onClose={() => setFocalEmojiPanelOpen(false)}
                        />
                      )}
                    </AnimatePresence>

                    {/* Quick reaction row — hidden while full panel is open */}
                    {!focalEmojiPanelOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.92 }}
                        transition={{ delay: 0.12, type: "spring", stiffness: 360, damping: 26 }}
                        className="flex justify-center"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <ReactionPicker
                          onPick={(emoji) => {
                            onReact?.(emoji);
                            setMenuOpen(false);
                          }}
                          onOpenFullPanel={() => setFocalEmojiPanelOpen(true)}
                          variant="insight"
                        />
                      </motion.div>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body,
          )}

        {/*
         * Legacy Pattern Stream hover affordance — kept ONLY on the pattern
         * surface. On the Insight surface (Messenger/Telegram convention)
         * the message menu opens via long-press → reaction picker → "more",
         * so an always-allocated 28-44px hover gutter would just push the
         * outbound bubble away from the right edge.
         */}
        {isSelf && !isInsight && (
          <button
            type="button"
            onClick={openMenu}
            className="opacity-0 group-hover:opacity-100 transition-opacity ps-btn-icon ps-btn-ghost"
            style={{ width: 28, height: 28 }}
            aria-label="Message options"
          >
            <DotsThreeVertical size={16} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Below-bubble caption used on the Insight surface.
 * Renders only on cluster TAIL/SINGLE (Messenger / Telegram convention).
 *
 * Format examples:
 *   inbound  →  "14:22"
 *   outbound (not latest)         →  "14:45"
 *   outbound (latest, sent)       →  "14:45 · Sent"
 *   outbound (latest, delivered)  →  "14:45 · Delivered"
 *   outbound (latest, read)       →  "14:45 · ✓ Seen"  (gold)
 *   outbound (latest, sending)    →  "Sending…"
 *   outbound (latest, failed)     →  "Failed · Retry"  (negative, button)
 */
function InsightTimeBelow({
  time,
  align,
  isSelf,
  status,
  onRetry,
  inline = false,
}: {
  time: string;
  align: "start" | "end";
  isSelf: boolean;
  status: "sending" | "sent" | "delivered" | "read" | "failed" | null;
  onRetry?: () => void;
  /** When true, omits self-start/self-end — parent flex row handles alignment. */
  inline?: boolean;
}) {
  const alignClass = inline ? undefined : align === "end" ? "self-end" : "self-start";

  if (isSelf && status === "failed") {
    return (
      <button
        type="button"
        onClick={onRetry}
        className={cn("ps-bubble__time-below", alignClass)}
        style={{
          color: "var(--ps-negative)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      >
        Failed · Retry
      </button>
    );
  }

  if (isSelf && status === "sending") {
    return (
      <span className={cn("ps-bubble__time-below", alignClass)} style={{ fontStyle: "italic" }}>
        Sending…
      </span>
    );
  }

  if (isSelf && status === "read") {
    return (
      <span className={cn("ps-bubble__time-below", alignClass, "ps-bubble__time-below--seen")}>
        <span>{time}</span>
        <span aria-hidden style={{ opacity: 0.5 }}>·</span>
        <CheckCircle size={11} weight="fill" />
        <span style={{ textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 }}>
          Seen
        </span>
      </span>
    );
  }

  if (isSelf && (status === "sent" || status === "delivered")) {
    return (
      <span className={cn("ps-bubble__time-below", alignClass)}>
        <span>{time}</span>
        <span aria-hidden style={{ opacity: 0.5 }}>·</span>
        <Check size={11} weight="bold" />
        <span>{status === "delivered" ? "Delivered" : "Sent"}</span>
      </span>
    );
  }

  return (
    <span className={cn("ps-bubble__time-below", alignClass)}>
      {time}
    </span>
  );
}

function formatBubbleTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function MenuItem({
  icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md"
      style={{
        fontSize: 13,
        color: destructive ? "var(--ps-negative)" : "var(--ps-text)",
        background: "transparent",
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--ps-glass-bg-active)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
    >
      {icon}
      {label}
    </button>
  );
}

/**
 * Stitch-style action row inside the Insight focal modal.
 * Larger touch target (44px), staggered fade-in driven by `index`, and uses
 * the `--insight-divider-pill-bg` token for hover so the menu blends with
 * its glass surface in both dark and light modes.
 */
function FocalMenuItem({
  icon,
  label,
  onClick,
  destructive,
  index = 0,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  index?: number;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.08 + index * 0.04, duration: 0.18, ease: "easeOut" }}
      className="flex items-center gap-3 w-full text-left rounded-xl transition-colors"
      style={{
        fontSize: 15,
        fontWeight: 500,
        padding: "12px 14px",
        color: destructive ? "var(--ps-negative)" : "var(--ps-text)",
        background: "transparent",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLElement).style.background = "var(--insight-divider-pill-bg)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLElement).style.background = "transparent")
      }
    >
      <span
        className="flex items-center justify-center"
        style={{
          width: 24,
          height: 24,
          color: destructive ? "var(--ps-negative)" : "var(--insight-gold)",
        }}
      >
        {icon}
      </span>
      <span>{label}</span>
    </motion.button>
  );
}

function parseMediaImageUrls(content: Record<string, unknown>): string[] {
  const raw = content.urls ?? content.images;
  if (Array.isArray(raw)) {
    return raw.filter((u): u is string => typeof u === "string" && u.length > 0);
  }
  const single = content.url;
  if (typeof single === "string" && single.length > 0) return [single];
  return [];
}

function mediaGridClass(count: number): string {
  if (count === 2) return "grid-cols-2 grid-rows-1";
  if (count === 3) return "grid-cols-2 grid-rows-2";
  if (count === 4) return "grid-cols-2 grid-rows-2";
  return "grid-cols-3 grid-rows-3";
}

function MediaGallery({ urls }: { urls: string[] }) {
  const count = urls.length;
  if (count === 0) return null;

  if (count === 1) {
    return (
      <div className="ps-media-gallery">
        <img
          src={urls[0]}
          alt=""
          loading="lazy"
          decoding="async"
          className="ps-media-gallery__single"
        />
      </div>
    );
  }

  const maxVisible = count > 9 ? 9 : count;
  const overflow = count > maxVisible ? count - (maxVisible - 1) : 0;
  const visible = overflow > 0 ? urls.slice(0, maxVisible - 1) : urls.slice(0, maxVisible);

  return (
    <div className={cn("ps-media-gallery ps-media-gallery__grid", mediaGridClass(visible.length))}>
      {visible.map((url, idx) => {
        const isHero = visible.length === 3 && idx === 0;
        const showOverflow = overflow > 0 && idx === visible.length - 1;
        return (
          <div
            key={`${idx}-${url}`}
            className={cn(
              "ps-media-gallery__cell",
              isHero && "row-span-2",
              visible.length === 2 && "aspect-square",
              visible.length === 3 && idx > 0 && "aspect-square",
              visible.length === 4 && "aspect-square",
              visible.length >= 5 && "aspect-square",
            )}
          >
            <img src={url} alt="" loading="lazy" decoding="async" />
            {showOverflow ? (
              <div className="ps-media-gallery__overflow" aria-hidden>
                +{overflow}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function MediaContent({ content }: { content: Record<string, unknown> }) {
  const kind = (content?.kind as string) ?? "image";
  const urls = parseMediaImageUrls(content);

  if (kind === "image" && urls.length > 0) {
    return <MediaGallery urls={urls} />;
  }

  const fallbackUrl = (content?.url as string) ?? urls[0] ?? "";
  if (!fallbackUrl) return null;

  return (
    <a
      href={fallbackUrl}
      target="_blank"
      rel="noreferrer"
      className="text-[var(--ps-green)] text-sm underline-offset-2 hover:underline"
    >
      {(content?.name as string) ?? "Attachment"}
    </a>
  );
}
