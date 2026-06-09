import { AnimatePresence, motion } from "framer-motion";
import { WifiSlash, ArrowsClockwise, CheckCircle } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type RealtimeStatus = "online" | "reconnecting" | "offline";

interface ConnectionBannerProps {
  status: RealtimeStatus;
  pendingOutbound?: number;
  /**
   * `pattern` — fixed glass bar (Pattern Stream).
   * `insight` — in-flow strip with Insight tokens (room chat opened from Insight).
   */
  variant?: "pattern" | "insight";
}

/**
 * Top-of-screen banner for realtime/connection health.
 * Auto-hides when status returns to 'online' (after a brief OK flash).
 */
export function ConnectionBanner({
  status,
  pendingOutbound = 0,
  variant = "pattern",
}: ConnectionBannerProps) {
  const [visible, setVisible] = useState(status !== "online");
  const [showOk, setShowOk] = useState(false);

  useEffect(() => {
    if (status === "online") {
      if (visible) {
        setShowOk(true);
        const t = setTimeout(() => {
          setVisible(false);
          setShowOk(false);
        }, 1400);
        return () => clearTimeout(t);
      }
      return;
    }
    setShowOk(false);
    setVisible(true);
  }, [status, visible]);

  if (!visible && pendingOutbound === 0) return null;

  const insightState = showOk ? "online" : status;

  const insightBannerClass = cn(
    "relative z-[1] flex w-full items-center justify-center gap-2 border-b px-4 py-2.5 text-sm",
    insightState === "online"
      ? "border-border/60 bg-muted/40 text-emerald-600 dark:text-emerald-400"
      : insightState === "reconnecting"
        ? "border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-300"
        : "border-rose-500/35 bg-rose-500/10 text-rose-800 dark:text-rose-300",
  );

  return (
    <AnimatePresence>
      <motion.div
        key="banner"
        initial={{ y: variant === "insight" ? -8 : -56, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: variant === "insight" ? -8 : -56, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className={variant === "insight" ? insightBannerClass : "ps-connection-banner"}
        data-state={insightState}
        role="status"
        aria-live="polite"
      >
        {showOk ? (
          <>
            <CheckCircle size={16} weight="fill" />
            <span>Back online</span>
          </>
        ) : status === "reconnecting" ? (
          <>
            <ArrowsClockwise size={16} className="animate-spin" />
            <span>Reconnecting{pendingOutbound > 0 ? ` (${pendingOutbound} pending)` : "..."}</span>
          </>
        ) : (
          <>
            <WifiSlash size={16} />
            <span>Offline{pendingOutbound > 0 ? ` (${pendingOutbound} queued)` : ""}</span>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
