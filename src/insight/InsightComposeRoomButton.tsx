import { PenSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { INSIGHT_FOCUS_RING } from '@/insight/insightCardTokens';

/**
 * Messenger-style "Compose new chat" entry. Two presentation flavors that are mounted
 * from different layout slots in `InsightPage`:
 *
 * - {@link InsightComposeRoomHeaderButton}: icon button next to the Discover/Rooms toggle
 *   on every screen size (always visible — primary affordance on desktop).
 * - {@link InsightComposeRoomFab}: floating action button bottom-right, above the
 *   Insight bottom nav, used as the prominent CTA on mobile.
 */
const DEFAULT_TARGET = '/dashboard/pattern-stream/console/create';

interface InsightComposeRoomBaseProps {
  to?: string;
  className?: string;
  ariaLabel?: string;
}

export function InsightComposeRoomHeaderButton({
  to = DEFAULT_TARGET,
  className,
  ariaLabel = 'Create new chat',
}: InsightComposeRoomBaseProps) {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border border-border/70 bg-muted/40 p-2.5 transition-colors duration-200 ease-out',
        'hover:bg-muted/25',
        INSIGHT_FOCUS_RING,
        'touch-manipulation [-webkit-tap-highlight-color:transparent]',
        className,
      )}
      aria-label={ariaLabel}
    >
      <PenSquare className="h-5 w-5 shrink-0 text-foreground" aria-hidden strokeWidth={1.75} />
    </Link>
  );
}

interface InsightComposeRoomFabProps extends InsightComposeRoomBaseProps {
  /**
   * When the global bottom nav is mounted, lift the FAB above it so it never
   * sits under the rounded tab pill. Pass false to remove the extra inset.
   */
  liftAboveBottomNav?: boolean;
}

export function InsightComposeRoomFab({
  to = DEFAULT_TARGET,
  className,
  ariaLabel = 'Create new chat',
  liftAboveBottomNav = true,
}: InsightComposeRoomFabProps) {
  return (
    <Link
      to={to}
      className={cn(
        'fixed right-[max(1rem,env(safe-area-inset-right))] z-[60]',
        'inline-flex h-14 w-14 items-center justify-center rounded-full',
        'bg-foreground text-background shadow-[0_8px_24px_rgba(0,0,0,0.18)]',
        'transition-transform duration-200 ease-out hover:scale-[1.04] active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-0',
        'touch-manipulation [-webkit-tap-highlight-color:transparent]',
        liftAboveBottomNav
          ? 'bottom-[max(5.25rem,calc(env(safe-area-inset-bottom)+5.25rem))]'
          : 'bottom-[max(1.25rem,env(safe-area-inset-bottom))]',
        className,
      )}
      aria-label={ariaLabel}
    >
      <PenSquare className="h-5 w-5" aria-hidden strokeWidth={1.75} />
    </Link>
  );
}
