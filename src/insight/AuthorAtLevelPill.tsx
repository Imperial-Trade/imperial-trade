import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Author level pill: glass chip with blue outline, mint tint, “@” + level.
 * Same treatment on profile hero, feeds, search, composer, and everywhere else.
 */
export function AuthorAtLevelPill({
  level,
  className,
}: {
  level: string;
  className?: string;
}) {
  const label = level?.trim() || 'Apprentice';
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full',
        'supports-[backdrop-filter]:backdrop-blur-md',
        'px-2 py-0.5 text-[10px] font-medium leading-none sm:text-xs',
        'border border-blue-500/70 bg-emerald-500/12 text-emerald-900 shadow-sm',
        'dark:border-white/35 dark:bg-white/15 dark:text-white dark:shadow-none',
        className
      )}
      aria-label={`Level ${label}`}
    >
      <span
        className="font-semibold text-blue-700 dark:text-white"
        aria-hidden
      >
        @
      </span>
      <span>{label}</span>
    </span>
  );
}
