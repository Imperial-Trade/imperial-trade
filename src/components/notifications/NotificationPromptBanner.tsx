import React from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/contexts/NotificationsContext';

interface NotificationPromptBannerProps {
  onDismiss?: () => void;
  showAlways?: boolean;
}

export const NotificationPromptBanner: React.FC<NotificationPromptBannerProps> = ({ 
  onDismiss,
  showAlways = false 
}) => {
  const { 
    permission, 
    isGranted, 
    hasSubscription,
    isIframeBlocked,
    requestPermission,
    browserInstructions 
  } = useNotifications();

  // Don't show if already granted or if not needed
  if (!showAlways && (isGranted || permission === 'granted' || hasSubscription)) {
    return null;
  }

  // Don't show if permission was explicitly denied
  if (permission === 'denied') {
    return null;
  }

  const handleEnableNotifications = async () => {
    try {
      const result = await requestPermission();
      if (result.success) {
        onDismiss?.();
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
    }
  };

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <Bell className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-foreground mb-1">
            Enable Trading Notifications
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            {isIframeBlocked 
              ? "Get instant alerts for new signals and trading opportunities. Open this page in a new tab to enable notifications."
              : "Get instant alerts for new signals, take profit hits, and trading opportunities."
            }
          </p>
          {browserInstructions && (
            <p className="text-xs text-muted-foreground mb-3 italic">
              {browserInstructions}
            </p>
          )}
          <div className="flex gap-2">
            {isIframeBlocked ? (
              <Button
                size="sm"
                onClick={() => window.open(window.location.href, '_blank')}
                className="text-sm"
              >
                Open in New Tab
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleEnableNotifications}
                className="text-sm"
              >
                Enable Notifications
              </Button>
            )}
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="text-sm"
              >
                Maybe Later
              </Button>
            )}
          </div>
        </div>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="p-1 h-auto"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};