import * as React from 'react';
import { cn } from '@/lib/utils';
import { INSIGHT_CARD_GROUP_CLASS } from '@/insight/insightCardTokens';

interface SettingsCardGroupProps {
  /** Optional small uppercase muted caption above the group (e.g. "SETTINGS"). */
  caption?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Insight settings card group — same surface family as `InsightRoomCard` (rounded-2xl,
 * `border-border/60`, `bg-card/40`) with hairline row dividers. Renders in WhatsApp-style
 * grouped lists; on desktop two-pane it is also reused as the rail-nav surface.
 */
export function SettingsCardGroup({
  caption,
  className,
  children,
}: SettingsCardGroupProps) {
  return (
    <div className={cn('w-full', className)}>
      {caption ? (
        <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
          {caption}
        </p>
      ) : null}
      <div className={INSIGHT_CARD_GROUP_CLASS} role="group">
        {children}
      </div>
    </div>
  );
}
