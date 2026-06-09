import * as React from 'react';
import { ArrowLeft, QrCode, Search as SearchIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { INSIGHT_FOCUS_RING } from '@/insight/insightCardTokens';

interface SettingsTopBarProps {
  /** Render the detail-page back row (`<- Title`) instead of the index search/QR row. */
  variant?: 'index' | 'detail';
  /** Title shown in the detail variant (centered, single line). */
  title?: string;
  /** Override back-link target; defaults to `/dashboard/insight/settings`. */
  backTo?: string;
  /** Tap on the search button. */
  onSearch?: () => void;
  /** Tap on the QR scanner button. */
  onScanQr?: () => void;
}

const circleButtonClass = cn(
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
  'border border-border/60 bg-muted/40 text-muted-foreground transition-colors',
  'hover:bg-muted/30 hover:text-foreground',
  'touch-manipulation [-webkit-tap-highlight-color:transparent]',
  INSIGHT_FOCUS_RING,
);

/**
 * Settings top row.
 * - `index`: circular Search button on the left, circular QR scanner on the right (matches the
 *   WhatsApp settings reference). Embedded inside `FeedComposerStrip` for the same flat header.
 * - `detail`: back-arrow + section title for sub-pages.
 */
export function SettingsTopBar({
  variant = 'index',
  title,
  backTo = '/dashboard/insight/settings',
  onSearch,
  onScanQr,
}: SettingsTopBarProps) {
  if (variant === 'detail') {
    return (
      <div className="flex min-w-0 w-full items-center gap-2 pb-1">
        <Link
          to={backTo}
          className={cn(
            'shrink-0 self-center rounded-full p-2.5 text-muted-foreground transition-colors',
            'hover:bg-muted/25 hover:text-foreground',
            INSIGHT_FOCUS_RING,
          )}
          aria-label="Back to Settings"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {title}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 w-full items-center justify-between gap-2 pb-1">
      <button
        type="button"
        onClick={onSearch}
        className={circleButtonClass}
        aria-label="Search settings"
      >
        <SearchIcon className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onScanQr}
        className={circleButtonClass}
        aria-label="Scan QR to link a device"
      >
        <QrCode className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
