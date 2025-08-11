import React, { useEffect, useState } from 'react';
import { useNotifications } from '@/contexts/NotificationsContext';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';

const NotificationPermissionBanner: React.FC = () => {
  const { isPromptDismissed, requestPermission, dismissPrompt, initialized, permission, isIframeBlocked } = useNotifications();
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (permission && permission !== 'default') {
      // Auto-close once the user makes a choice
      dismissPrompt();
    }
  }, [permission, dismissPrompt]);

  if (isPromptDismissed) return null;

  return (
    <aside
      role="region"
      aria-label="Notifications permission prompt"
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] sm:max-w-lg rounded-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg"
    >
      <div className="px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-md bg-muted p-1.5" aria-hidden="true">
            <Bell className="h-4 w-4 text-foreground" />
          </div>
          <div className="flex-1 text-xs sm:text-sm">
            <h2 className="text-sm font-medium">Enable push notifications</h2>
            <p className="mt-0.5 text-muted-foreground">Stay on top of live signals, TP hits, and risk alerts.</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          {isIframeBlocked ? (
            <>
              <Button
                size="sm"
                onClick={() => window.open(window.location.href, '_blank', 'noopener,noreferrer')}
                title="Open the app in a new tab to enable notifications"
              >
                Open in new tab
              </Button>
              <Button size="sm" variant="ghost" onClick={dismissPrompt}>
                Not now
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={dismissPrompt}>
                Not now
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  try {
                    setRequesting(true);
                    await requestPermission();
                  } finally {
                    setRequesting(false);
                  }
                }}
                disabled={!initialized || requesting}
                aria-disabled={!initialized || requesting}
                title={!initialized ? 'Preparing notifications...' : undefined}
              >
                {requesting ? (
                  <span className="mr-2 inline-flex h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent align-[-0.125em]" />
                ) : null}
                {requesting ? 'Enabling…' : 'Enable notifications'}
              </Button>
            </>
          )}
        </div>
        {!requesting && initialized && (permission === 'default' || isIframeBlocked) ? (
          <p className="mt-2 text-[11px] sm:text-xs text-muted-foreground">
            {isIframeBlocked
              ? 'Push notifications are blocked in preview. Open in a new tab to enable.'
              : 'No prompt? Check site settings (lock icon) → Notifications.'}
          </p>
        ) : null}
      </div>
    </aside>
  );
};

export default NotificationPermissionBanner;
