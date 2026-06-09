import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { INSIGHT_CARD_CLASS } from '@/insight/insightCardTokens';

interface ComingSoonCardProps {
  /** Section title (e.g. "Linked devices"). */
  title: string;
  /** One- or two-line description of what this section will do once shipped. */
  description: string;
  className?: string;
}

/**
 * Neutral empty-state card used by stubbed Settings sections. Same card surface as Insight
 * Discover/Joined Rooms so the visual language is consistent from day one.
 */
export function ComingSoonCard({
  title,
  description,
  className,
}: ComingSoonCardProps) {
  return (
    <div
      className={cn(INSIGHT_CARD_CLASS, 'px-6 py-10 text-center', className)}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-muted/60 text-muted-foreground">
        <Sparkles className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="mt-3 text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <p className="mt-3 text-xs text-muted-foreground/70">
        Coming soon — we’re building this for you.
      </p>
    </div>
  );
}
