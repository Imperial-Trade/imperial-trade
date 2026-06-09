import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { pushRecentReactionEmoji } from "@/utils/recentReactionEmojis";

export const QUICK_EMOJIS = ["❤️", "😆", "😮", "😢", "😡", "👍"];

export type ReactionPickerVariant = "pattern" | "insight";

interface ReactionPickerProps {
  /** When omitted, the picker is always rendered (focal modal). */
  open?: boolean;
  onPick: (emoji: string) => void;
  /** Opens the full categorized panel (focal modal — rendered by parent below menu). */
  onOpenFullPanel?: () => void;
  variant?: ReactionPickerVariant;
  className?: string;
}

function EmojiButton({
  emoji,
  onPick,
  delay = 0,
}: {
  emoji: string;
  onPick: (emoji: string) => void;
  delay?: number;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, scale: 0.55 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.55 }}
      transition={{ type: "spring", stiffness: 460, damping: 24, delay }}
      whileTap={{ scale: 0.82 }}
      whileHover={{ scale: 1.12, y: -1 }}
      onClick={() => onPick(emoji)}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/10"
      style={{ fontSize: 22 }}
      role="menuitem"
      aria-label={`React ${emoji}`}
    >
      {emoji}
    </motion.button>
  );
}

/**
 * Quick reaction row — single line with + on the right.
 * Full emoji panel is opened via `onOpenFullPanel` (parent renders ReactionEmojiPanel).
 */
export function ReactionPicker({
  open,
  onPick,
  onOpenFullPanel,
  variant = "pattern",
  className,
}: ReactionPickerProps) {
  const isInsight = variant === "insight";

  const handlePick = useCallback(
    (emoji: string) => {
      pushRecentReactionEmoji(emoji);
      onPick(emoji);
    },
    [onPick],
  );

  const body = (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      className={cn(
        "inline-flex max-w-none px-2 py-1.5 liquid-glass liquid-glass--pill",
        isInsight && "insight-liquid-glass-context",
        className,
      )}
      style={{ borderRadius: 9999 }}
      role="menu"
      aria-label="React with emoji"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex flex-nowrap items-center gap-0.5">
        {QUICK_EMOJIS.map((emoji, idx) => (
          <EmojiButton key={emoji} emoji={emoji} onPick={handlePick} delay={idx * 0.03} />
        ))}
        {onOpenFullPanel && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.55 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 460,
              damping: 24,
              delay: QUICK_EMOJIS.length * 0.03,
            }}
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.06 }}
            onClick={(e) => {
              e.stopPropagation();
              onOpenFullPanel();
            }}
            className={cn(
              "ml-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              "border border-white/10 bg-white/5 text-muted-foreground transition-colors",
              "hover:bg-white/10 hover:text-foreground",
            )}
            aria-label="More reactions"
            aria-expanded={false}
          >
            <Plus size={18} weight="bold" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );

  if (open === undefined) {
    return body;
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 6 }}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        >
          {body}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
