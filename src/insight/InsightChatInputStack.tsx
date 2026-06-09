import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  INSIGHT_VK_MOTION,
  insightChatInputStackComposerClass,
  insightChatInputStackShellClass,
} from '@/insight/orderflowChrome';

const STACK_Z = 'z-[1260]';

export interface InsightChatInputStackProps {
  open: boolean;
  composerSlot: ReactNode;
  children: ReactNode;
  onStackHeightChange?: (px: number) => void;
}

/**
 * Unified bottom input stack: Insight liquid-glass composer strip + keyboard well.
 */
export function InsightChatInputStack({
  open,
  composerSlot,
  children,
  onStackHeightChange,
}: InsightChatInputStackProps) {
  const stackRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    if (!open) {
      onStackHeightChange?.(0);
      return;
    }
    const el = stackRef.current;
    if (!el) return;
    const report = () => {
      onStackHeightChange?.(Math.ceil(el.getBoundingClientRect().height));
    };
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, onStackHeightChange]);

  if (typeof document === 'undefined') return null;

  const slideTransition = reduceMotion
    ? { duration: 0 }
    : { type: 'tween' as const, ...INSIGHT_VK_MOTION.open };

  const exitTransition = reduceMotion
    ? { duration: 0 }
    : { type: 'tween' as const, ...INSIGHT_VK_MOTION.exit };

  return createPortal(
    <AnimatePresence mode="sync">
      {open ? (
        <motion.div
          ref={stackRef}
          key="insight-chat-input-stack"
          data-insight-chat-input-stack
          initial={{ y: reduceMotion ? 0 : '100%' }}
          animate={{ y: 0 }}
          exit={{ y: reduceMotion ? 0 : '100%', transition: exitTransition }}
          transition={slideTransition}
          className={cn(
            STACK_Z,
            'fixed bottom-0 left-0 right-0 md:right-[4.5rem]',
            'mx-auto w-full max-w-lg',
            insightChatInputStackShellClass,
            'pl-[max(4px,env(safe-area-inset-left))]',
            'pr-[max(4px,env(safe-area-inset-right))]',
          )}
        >
          <div className={cn(insightChatInputStackComposerClass, 'px-0 pt-0')}>
            {composerSlot}
          </div>
          <div className="-mt-px rounded-t-[14px] bg-[#1c1c1e]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            {children}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
