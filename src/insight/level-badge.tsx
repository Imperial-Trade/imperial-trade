import React from 'react';
import { cn } from '@/lib/utils';
import { AuthorAtLevelPill } from '@/insight/AuthorAtLevelPill';

interface LevelBadgeProps {
  level: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** @deprecated Prefer `AuthorAtLevelPill`; kept for call sites — renders the same pill everywhere. */
export function LevelBadge({ level, size = 'md', className }: LevelBadgeProps) {
  const scale =
    size === 'sm'
      ? 'origin-left scale-[0.92]'
      : size === 'lg'
        ? 'sm:text-sm'
        : '';
  return (
    <AuthorAtLevelPill level={level} className={cn(scale, className)} />
  );
}

export function getLevelRingColor(level: string): string {
  switch (level?.toLowerCase()) {
    case 'apprentice':
      return 'ring-blue-500';
    case 'skilled':
      return 'ring-green-700';
    case 'elite':
      return 'ring-orange-500';
    default:
      return 'ring-blue-500';
  }
}
