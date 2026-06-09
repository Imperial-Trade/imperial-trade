import { Check, Checks, CheckCircle, Clock, ArrowClockwise } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";

export type DeliveryStatus = "sending" | "sent" | "delivered" | "read" | "failed";
export type DeliveryTicksSurface = "pattern" | "insight";

interface DeliveryTicksProps {
  status: DeliveryStatus;
  onRetry?: () => void;
  /** `insight` switches the "read" tick to the gold Stitch check-circle + SEEN label. */
  surface?: DeliveryTicksSurface;
}

export function DeliveryTicks({ status, onRetry, surface = "pattern" }: DeliveryTicksProps) {
  const isInsight = surface === "insight";

  return (
    <span
      className="inline-flex items-center gap-1"
      style={{
        fontSize: 12,
        color: isInsight ? "var(--insight-divider-pill-fg)" : "var(--ps-text-tertiary)",
      }}
      aria-label={`Status: ${status}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {status === "sending" && (
          <motion.span
            key="sending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <Clock size={14} />
          </motion.span>
        )}
        {status === "sent" && (
          <motion.span
            key="sent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <Check size={14} weight={isInsight ? "bold" : "regular"} />
          </motion.span>
        )}
        {status === "delivered" && (
          <motion.span
            key="delivered"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <Checks size={14} />
          </motion.span>
        )}
        {status === "read" && (
          <motion.span
            key="read"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ color: isInsight ? "var(--insight-gold)" : "var(--ps-green)" }}
            className={isInsight ? "inline-flex items-center gap-1" : undefined}
          >
            {isInsight ? (
              <>
                <CheckCircle size={14} weight="fill" />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                  }}
                >
                  Seen
                </span>
              </>
            ) : (
              <Checks size={14} weight="fill" />
            )}
          </motion.span>
        )}
        {status === "failed" && (
          <motion.button
            key="failed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onClick={onRetry}
            type="button"
            aria-label="Retry"
            style={{ color: "var(--ps-negative)" }}
          >
            <ArrowClockwise size={14} />
          </motion.button>
        )}
      </AnimatePresence>
    </span>
  );
}
