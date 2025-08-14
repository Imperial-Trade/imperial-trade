import React, { useEffect, useState } from 'react';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useWelcome } from '@/contexts/WelcomeContext';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
const NotificationPermissionBanner: React.FC = () => {
  const { isPromptDismissed, requestPermission, dismissPrompt, initialized, permission, isIframeBlocked, browserInfo, browserInstructions } = useNotifications();
  const { hasSeenWelcome } = useWelcome();
  const [requesting, setRequesting] = useState(false);
  const [ready, setReady] = useState(false);
  
  const isDenied = permission === 'denied';

  // Wait until the welcome animation completes before showing the banner
  useEffect(() => {
    if (hasSeenWelcome) {
      const id = setTimeout(() => setReady(true), 400);
      return () => clearTimeout(id);
    } else {
      setReady(false);
    }
  }, [hasSeenWelcome]);

  // Debug logging for banner visibility
  console.log('NotificationPermissionBanner visibility check:', {
    hasSeenWelcome,
    ready,
    isPromptDismissed,
    initialized,
    permission,
    isIframeBlocked
  });

  if (!hasSeenWelcome || !ready || isPromptDismissed) return null;

  return (
    <aside
      role="region"
      aria-label="Notifications permission prompt"
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto w-[calc(100%-1.5rem)] sm:max-w-lg rounded-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg"
    >
      <div className="px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-md bg-muted p-1.5" aria-hidden="true">
            <Bell className="h-4 w-4 text-foreground" />
          </div>
          <div className="flex-1 text-xs sm:text-sm">
            <h2 className="text-sm font-medium">
              {isDenied ? 'Re-enable push notifications' : 'Enable push notifications'}
            </h2>
            <p className="mt-0.5 text-muted-foreground">
              {isDenied 
                ? 'Notifications are blocked. Re-enable them to get alerts for signals, TP hits, and risk updates.'
                : 'Stay on top of live signals, TP hits, and risk alerts.'
              }
            </p>
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
                {isDenied ? 'Allow in browser settings' : 'Open in new tab'}
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
                    const result = await requestPermission();
                    const current = typeof Notification !== 'undefined' ? Notification.permission : permission;
                    
                    if (result.success) {
                      toast({ 
                        title: 'Push notifications enabled', 
                        description: 'You will receive alerts even when the app is closed.' 
                      });
                      dismissPrompt();
                    } else if (current === 'denied') {
                      toast({ 
                        title: 'Notifications blocked', 
                        description: 'Use the browser site settings (lock icon) to Allow notifications.', 
                        variant: 'destructive' as any 
                      });
                    } else if (result.error) {
                      // Enhanced error handling with browser-specific messages
                      const errorTitle = result.details?.step === 'user_creation' 
                        ? 'OneSignal setup failed'
                        : result.details?.step === 'onesignal_subscribe'
                        ? 'Subscription failed'
                        : result.details?.step === 'native_permission'
                        ? 'Permission request failed'
                        : result.details?.browser 
                        ? `${result.details.browser} setup incomplete`
                        : 'Setup incomplete';
                      
                      let errorDescription = result.error;
                      
                      // Provide browser-specific guidance
                      if (result.details?.instructions) {
                        errorDescription = `${result.error}\n\n${result.details.instructions}`;
                      } else if (result.error.includes('iframe')) {
                        errorDescription = 'Open in a new tab to enable notifications';
                      } else if (result.error.includes('denied')) {
                        errorDescription = browserInstructions || 'Check browser settings to allow notifications';
                      } else if (result.error.includes('not supported')) {
                        errorDescription = `${result.error}. Please update your browser or try a different one.`;
                      }

                      toast({ 
                        title: errorTitle,
                        description: errorDescription,
                        variant: 'destructive' as any 
                      });
                    } else {
                      toast({ 
                        title: 'No prompt shown?', 
                        description: "If you didn't see a prompt, open site settings (lock icon) → Notifications." 
                      });
                    }
                  } finally {
                    setRequesting(false);
                  }
                }}
                disabled={requesting}
                aria-disabled={requesting}
                title={requesting ? 'Request in progress…' : undefined}
              >
                {requesting ? (
                  <span className="mr-2 inline-flex h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent align-[-0.125em]" />
                ) : null}
                {requesting ? 'Enabling…' : isDenied ? 'Allow in browser settings' : 'Enable notifications'}
              </Button>
            </>
          )}
        </div>
        {!requesting && initialized && (permission === 'default' || permission === 'denied' || isIframeBlocked) ? (
          <p className="mt-2 text-[11px] sm:text-xs text-muted-foreground">
            {isDenied
              ? 'Click the lock/bell icon in your browser address bar, then select "Allow" for notifications.'
              : isIframeBlocked
                ? 'Push notifications are blocked in preview. Open in a new tab to enable.'
                : browserInstructions || 'No prompt? Check site settings (lock icon) → Notifications.'}
          </p>
        ) : null}
      </div>
    </aside>
  );
};

export default NotificationPermissionBanner;
