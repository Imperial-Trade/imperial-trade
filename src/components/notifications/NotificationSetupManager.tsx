import React, { useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFallbackNotifications } from '@/contexts/FallbackNotificationsContext';
import { useWelcome } from '@/contexts/WelcomeContext';
import { TradingNotificationModal } from '@/components/notifications/TradingNotificationModal';
import { usePostLoginNotificationSetup } from '@/hooks/usePostLoginNotificationSetup';

export const NotificationSetupManager: React.FC = () => {
  const { user, profile } = useAuth();
  const { 
    isGranted, 
    initialized
  } = useFallbackNotifications();
  const { hasSeenWelcome } = useWelcome();
  
  const {
    showModal,
    setShowModal,
    needsNotifications,
    notificationModalSettings,
    handleNotificationEnabled
  } = usePostLoginNotificationSetup();

  // Check if user needs fallback notification setup (always false now)
  const needsNativePrompt = useCallback(() => {
    // Always return false since push notifications are disabled
    return false;
  }, []);

  return (
    <>
      {/* Show TradingNotificationModal when needed */}
      <TradingNotificationModal
        isOpen={showModal && needsNotifications}
        onClose={() => setShowModal(false)}
        onNotificationEnabled={handleNotificationEnabled}
      />
    </>
  );
};

export default NotificationSetupManager;