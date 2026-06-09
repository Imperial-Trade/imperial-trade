import { motion } from "framer-motion";

export type TypingIndicatorSurface = "pattern" | "insight";

interface TypingIndicatorProps {
  surface?: TypingIndicatorSurface;
  /** Optional caption rendered next to the insight typing pill ("Sarah is thinking…"). */
  caption?: string;
}

export function TypingIndicator({ surface = "pattern", caption }: TypingIndicatorProps) {
  if (surface === "insight") {
    return (
      <div className="inline-flex items-center gap-3" aria-label={caption ?? "Typing"}>
        <div className="ps-insight-typing-pill" role="presentation">
          <span className="ps-insight-typing-dot" />
          <span className="ps-insight-typing-dot" />
          <span className="ps-insight-typing-dot" />
        </div>
        {caption && <span className="ps-insight-typing-caption">{caption}</span>}
      </div>
    );
  }

  return (
    <div
      className="liquid-glass inline-flex items-center gap-1 px-3 py-2"
      style={{ borderRadius: 18 }}
      aria-label="Typing"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block w-1.5 h-1.5 rounded-full bg-white/60"
          animate={{ scale: [0.7, 1, 0.7], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.96, repeat: Infinity, delay: i * 0.16 }}
        />
      ))}
    </div>
  );
}
