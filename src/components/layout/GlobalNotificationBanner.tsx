import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { NotificationPromptBanner } from '@/components/notifications';

/**
 * Global notification banner that appears throughout the app
 * Specifically designed for iOS Safari PWA support
 */
export const GlobalNotificationBanner: React.FC = () => {
  const { user } = useAuth();
  const { permission, isGranted, hasSubscription, isIframeBlocked } = useNotifications();
  const [isDismissed, setIsDismissed] = useState(false);

  // Reset dismissal when user changes
  useEffect(() => {
    setIsDismissed(false);
  }, [user?.id]);

  // Don't show if user is not logged in
  if (!user) {
    return null;
  }

  // Don't show if dismissed
  if (isDismissed) {
    return null;
  }

  // Don't show if already granted or has subscription
  if (isGranted || hasSubscription || permission === 'granted') {
    return null;
  }

  // Don't show if explicitly denied
  if (permission === 'denied') {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 w-full">
      <NotificationPromptBanner
        onDismiss={() => setIsDismissed(true)}
        showAlways={false}
      />
    </div>
  );
};