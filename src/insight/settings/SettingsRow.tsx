import * as React from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { INSIGHT_FOCUS_RING } from '@/insight/insightCardTokens';

export interface SettingsRowProps {
  /** Lucide icon (24px outline) shown in the leading slot. */
  icon?: LucideIcon;
  /** Optional fully-custom leading element (e.g. avatar). Wins over `icon`. */
  leading?: React.ReactNode;
  /** Primary label text. */
  label: string;
  /** Muted secondary text shown below the label (one line). */
  description?: string;
  /** Trailing content: value preview, switch, badge. Defaults to a chevron when navigable. */
  trailing?: React.ReactNode;
  /** Optional muted value preview (right-aligned text). */
  value?: string;
  /** Tap target — either a route or a click handler. */
  to?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Render as destructive (e.g. Sign out). */
  destructive?: boolean;
  /** Hide the trailing chevron even when navigable. */
  hideChevron?: boolean;
  /** Right-aligned badge (number / text). Uses the `--accent-green` token, not primary cyan. */
  badge?: string | number;
  className?: string;
}

const baseRowClasses = cn(
  'flex w-full items-center gap-3 px-4 min-h-14 md:min-h-12 text-left',
  'transition-colors',
  'active:bg-muted/30 hover:bg-muted/30',
  INSIGHT_FOCUS_RING,
);

function RowBadge({ value }: { value: string | number }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold',
        'bg-emerald-500/85 text-white shadow-sm',
      )}
    >
      {value}
    </span>
  );
}

function RowContent({
  icon: Icon,
  leading,
  label,
  description,
  trailing,
  value,
  destructive,
  badge,
  showChevron,
}: Omit<SettingsRowProps, 'to' | 'onClick' | 'className' | 'hideChevron'> & {
  showChevron: boolean;
}) {
  return (
    <>
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
          destructive
            ? 'text-rose-500'
            : 'text-muted-foreground',
        )}
        aria-hidden
      >
        {leading ??
          (Icon ? <Icon className="h-5 w-5" aria-hidden /> : null)}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-[15px] font-medium leading-tight',
            destructive ? 'text-rose-500' : 'text-foreground',
          )}
        >
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-2">
        {value ? (
          <span className="truncate text-sm text-muted-foreground">
            {value}
          </span>
        ) : null}
        {badge !== undefined ? <RowBadge value={badge} /> : null}
        {trailing}
        {showChevron ? (
          <ChevronRight
            className="h-4 w-4 text-muted-foreground/70"
            aria-hidden
          />
        ) : null}
      </span>
    </>
  );
}

/**
 * WhatsApp-style settings row with leading icon, label, optional value/switch/badge,
 * and trailing chevron. Navigates via `to` or fires `onClick`. Static rows (no `to`/`onClick`)
 * render as a plain div for read-only items.
 */
export function SettingsRow({
  icon,
  leading,
  label,
  description,
  trailing,
  value,
  to,
  onClick,
  destructive,
  hideChevron,
  badge,
  className,
}: SettingsRowProps) {
  const isNavigable = !!to || !!onClick;
  const showChevron = isNavigable && !hideChevron && trailing === undefined;

  const content = (
    <RowContent
      icon={icon}
      leading={leading}
      label={label}
      description={description}
      trailing={trailing}
      value={value}
      destructive={destructive}
      badge={badge}
      showChevron={showChevron}
    />
  );

  if (to) {
    return (
      <Link
        to={to}
        className={cn(
          baseRowClasses,
          'touch-manipulation [-webkit-tap-highlight-color:transparent]',
          className,
        )}
        aria-label={label}
      >
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          baseRowClasses,
          'touch-manipulation [-webkit-tap-highlight-color:transparent]',
          className,
        )}
        aria-label={label}
      >
        {content}
      </button>
    );
  }
  return (
    <div className={cn(baseRowClasses, 'cursor-default', className)}>
      {content}
    </div>
  );
}
