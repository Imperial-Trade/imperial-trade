import { motion } from "framer-motion";
import { Plus } from "@phosphor-icons/react";
import type { AggregatedReaction } from "@/hooks/pattern-stream/useMessageReactions";
import { cn } from "@/lib/utils";

export type ReactionBarSurface = "pattern" | "insight";

interface ReactionBarProps {
  reactions: AggregatedReaction[];
  onToggle: (emoji: string) => void;
  surface?: ReactionBarSurface;
  /** Messenger-style anchor on the bubble corner. */
  align?: "start" | "end";
  /** When true, renders below the message bubble (Insight only). */
  anchored?: boolean;
  /** Opens the reaction picker (plus affordance). */
  onPressAdd?: () => void;
}

const MAX_ANCHORED_EMOJIS = 5;

/** Compact count label — Telegram-style abbreviations for large totals. */
function formatReactionCount(count: number): string {
  if (count >= 1_000_000) {
    const v = count / 1_000_000;
    return `${v >= 10 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (count >= 10_000) return `${Math.round(count / 1000)}K`;
  if (count >= 1_000) {
    const v = count / 1000;
    return `${v >= 10 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, "")}K`;
  }
  return String(count);
}

/** Up to 5 unique types; if more, show top 4 by count + the least-count type as the 5th. */
function pickAnchoredReactions(reactions: AggregatedReaction[]): AggregatedReaction[] {
  const sorted = [...reactions].sort((a, b) => b.count - a.count);
  if (sorted.length <= MAX_ANCHORED_EMOJIS) return sorted;
  const top4 = sorted.slice(0, MAX_ANCHORED_EMOJIS - 1);
  const leastCount = sorted[sorted.length - 1];
  return [...top4, leastCount];
}

function InsightAnchoredReactionBar({
  reactions,
  onToggle,
  align,
  onPressAdd,
}: {
  reactions: AggregatedReaction[];
  onToggle: (emoji: string) => void;
  align: "start" | "end";
  onPressAdd?: () => void;
}) {
  const isSelf = align === "end";
  const display = pickAnchoredReactions(reactions);
  const totalCount = reactions.reduce((sum, r) => sum + r.count, 0);

  const plusButton = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onPressAdd?.();
      }}
      className="ps-insight-meta-reaction-add"
      aria-label="Add reaction"
    >
      <Plus size={12} weight="bold" />
    </button>
  );

  const emojiButtons = display.map((r) => (
    <button
      key={r.emoji}
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle(r.emoji);
      }}
      className="ps-insight-meta-reaction"
      data-mine={r.userReacted ? "true" : "false"}
      title={`${r.emoji} · ${r.count}`}
      aria-label={`${r.emoji} ${r.count} reactions`}
    >
      <span className="ps-insight-meta-reaction__emoji" aria-hidden>
        {r.emoji}
      </span>
      {r.count >= 2 && (
        <span className="ps-insight-meta-reaction__count ps-numeric">
          {formatReactionCount(r.count)}
        </span>
      )}
    </button>
  ));

  return (
    <motion.div
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 28 }}
      className={cn(
        "ps-insight-meta-reaction-strip inline-flex min-w-0 flex-nowrap items-center",
        isSelf ? "justify-end" : "justify-start",
      )}
      role="group"
      aria-label={`${totalCount} reaction${totalCount === 1 ? "" : "s"}`}
    >
      {isSelf ? (
        <>
          {emojiButtons}
          {plusButton}
        </>
      ) : (
        <>
          {plusButton}
          {emojiButtons}
        </>
      )}
    </motion.div>
  );
}

export function ReactionBar({
  reactions,
  onToggle,
  surface = "pattern",
  align = "start",
  anchored = false,
  onPressAdd,
}: ReactionBarProps) {
  if (reactions.length === 0) return null;

  if (surface === "insight" && anchored) {
    return (
      <InsightAnchoredReactionBar
        reactions={reactions}
        onToggle={onToggle}
        align={align}
        onPressAdd={onPressAdd}
      />
    );
  }

  if (surface === "insight") {
    return (
      <div className="flex flex-wrap gap-1 mt-1.5">
        {reactions.map((r) => (
          <motion.button
            key={r.emoji}
            type="button"
            onClick={() => onToggle(r.emoji)}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 400, damping: 26 }}
            className="ps-insight-reaction-pill"
            data-mine={r.userReacted ? "true" : "false"}
            title={r.users.length > 0 ? `${r.users.length} reacted` : undefined}
            aria-label={`${r.emoji} reacted by ${r.count}`}
          >
            <span style={{ fontSize: 12, lineHeight: 1 }}>{r.emoji}</span>
            <span className="ps-numeric" style={{ fontSize: 10, fontWeight: 600 }}>
              {r.count}
            </span>
          </motion.button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {reactions.map((r) => (
        <motion.button
          key={r.emoji}
          type="button"
          onClick={() => onToggle(r.emoji)}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: "spring", stiffness: 400, damping: 26 }}
          className="ps-chip"
          style={{
            height: 24,
            padding: "0 8px",
            background: r.userReacted ? "var(--ps-green-tint)" : undefined,
            borderColor: r.userReacted ? "var(--ps-green)" : undefined,
            color: r.userReacted ? "var(--ps-green)" : undefined,
            fontSize: 12,
          }}
          title={r.users.length > 0 ? `${r.users.length} reacted` : undefined}
          aria-label={`${r.emoji} reacted by ${r.count}`}
        >
          <span style={{ fontSize: 14 }}>{r.emoji}</span>
          <span className="ps-numeric">{r.count}</span>
        </motion.button>
      ))}
    </div>
  );
}
