import { motion } from "framer-motion";
import { ArrowsClockwise } from "@phosphor-icons/react";
import type { PullToRefreshState } from "@/hooks/pattern-stream/usePullToRefresh";

interface Props {
  state: PullToRefreshState;
}

export function PullToRefreshIndicator({ state }: Props) {
  const visible = state.pulling || state.refreshing;
  if (!visible) return null;
  const translate = state.refreshing ? 64 : Math.round(state.progress * 64);
  return (
    <motion.div
      className="ps-ptr"
      style={{ transform: `translateY(${translate}px)` }}
      aria-hidden
    >
      {state.refreshing ? (
        <span className="ps-ptr-spinner" />
      ) : (
        <motion.span
          animate={{ rotate: state.progress * 360 }}
          transition={{ type: "spring", stiffness: 200, damping: 22 }}
          style={{
            width: 26,
            height: 26,
            borderRadius: 9999,
            background: "var(--ps-glass-bg-active)",
            backdropFilter: "blur(12px)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ps-green)",
            opacity: state.progress,
          }}
        >
          <ArrowsClockwise size={14} />
        </motion.span>
      )}
    </motion.div>
  );
}
