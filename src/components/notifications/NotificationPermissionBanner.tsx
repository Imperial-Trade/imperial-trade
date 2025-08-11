import React, { useEffect, useState } from 'react';
import { useNotifications } from '@/contexts/NotificationsContext';
import { Button } from '@/components/ui/button';

const NotificationPermissionBanner: React.FC = () => {
  const { isPromptDismissed, requestPermission, dismissPrompt, initialized, permission } = useNotifications();
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
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] sm:w-auto sm:max-w-md rounded-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg"
    >
      <div className="px-3 py-2 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        <div className="text-xs sm:text-sm">
          <h2 className="text-sm font-medium">Enable push notifications</h2>
          <p className="text-muted-foreground">Stay on top of live signals, TP hits, and risk alerts.</p>
        </div>
        <div className="flex items-center gap-2">
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
            {requesting ? 'Enabling…' : 'Enable notifications'}
          </Button>
          <Button size="sm" variant="ghost" onClick={dismissPrompt}>
            Not now
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default NotificationPermissionBanner;
