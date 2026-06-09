import * as React from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface SettingsHeroProps {
  /** When true, render the compact rail variant (small avatar + name, used on desktop two-pane). */
  compact?: boolean;
  /** Override status caption text (defaults to user's stored status or `…`). */
  status?: string;
  className?: string;
}

function initialsFor(name: string | null | undefined) {
  if (!name) return 'IT';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join('') || name.charAt(0).toUpperCase();
}

/**
 * WhatsApp-style hero block: small "speech bubble" status chip above a large circular
 * avatar, then the display name centered. Tap on the hero opens the Profile section.
 */
export function SettingsHero({ compact, status, className }: SettingsHeroProps) {
  const { user, profile } = useAuth();
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'You';
  const handle = user?.email ? `@${user.email.split('@')[0]}` : '';
  const statusText = status ?? '…';
  const avatarUrl =
    (user?.user_metadata?.avatar_url as string | undefined) ?? null;

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3 px-2 py-3', className)}>
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full',
            'bg-muted/60 ring-1 ring-border/60 text-sm font-semibold text-foreground',
          )}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{initialsFor(displayName)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {displayName}
          </p>
          {handle ? (
            <p className="truncate text-xs text-muted-foreground">{handle}</p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center text-center pt-2 pb-5',
        className,
      )}
    >
      <span
        className={cn(
          'mb-3 inline-flex max-w-[12rem] items-center justify-center rounded-full',
          'bg-muted/60 px-3 py-1 text-xs text-muted-foreground',
        )}
        title="Status"
      >
        <span className="truncate">{statusText}</span>
      </span>
      <div
        className={cn(
          'flex h-24 w-24 items-center justify-center overflow-hidden rounded-full',
          'bg-muted/60 ring-1 ring-border/60 text-2xl font-semibold text-foreground',
        )}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{initialsFor(displayName)}</span>
        )}
      </div>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
        {displayName}
      </h2>
      {handle ? (
        <p className="mt-0.5 text-sm text-muted-foreground">{handle}</p>
      ) : null}
    </div>
  );
}
