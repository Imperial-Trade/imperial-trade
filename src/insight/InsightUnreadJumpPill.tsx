import { ArrowDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { INSIGHT_FOCUS_RING } from "@/insight/insightCardTokens";
import { insightChatComposerReserveHeightCss } from "@/insight/orderflowChrome";

function formatUnreadLabel(count: number): string {
  const n = count > 99 ? "99+" : String(count);
  return `${n} unread`;
}

interface InsightUnreadJumpPillProps {
  count: number;
  visible: boolean;
  onClick: () => void;
}

export function InsightUnreadJumpPill({ count, visible, onClick }: InsightUnreadJumpPillProps) {
  if (!visible || count <= 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[1210] flex justify-center px-4"
      style={{
        bottom: `calc(${insightChatComposerReserveHeightCss} + env(safe-area-inset-bottom, 0px) + var(--keyboard-inset, 0px) + 12px)`,
      }}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={`Jump to ${count > 99 ? "99 plus" : count} unread messages`}
        className={cn(
          "pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-muted/90 px-3 py-1.5 text-[13px] font-medium text-foreground shadow-md backdrop-blur-sm",
          INSIGHT_FOCUS_RING,
        )}
      >
        <span>{formatUnreadLabel(count)}</span>
        <ArrowDown className="size-4 shrink-0" weight="bold" aria-hidden />
      </button>
    </div>
  );
}
