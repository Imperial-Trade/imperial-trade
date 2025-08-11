import React from 'react';
import { useNotifications } from '@/contexts/NotificationsContext';
import { Button } from '@/components/ui/button';

const NotificationPermissionBanner: React.FC = () => {
  const { isPromptDismissed, requestPermission, dismissPrompt } = useNotifications();

  if (isPromptDismissed) return null;

  return (
    <aside
      role="region"
      aria-label="Notifications permission prompt"
      className="fixed inset-x-3 bottom-3 z-50 rounded-xl border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg"
    >
      <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm">
          <h2 className="font-medium">Enable push notifications</h2>
          <p className="text-muted-foreground">Stay on top of live signals, TP hits, and risk alerts in real time.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={requestPermission}>
            Enable notifications
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
