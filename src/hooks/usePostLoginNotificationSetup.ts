
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWelcome } from '@/contexts/WelcomeContext';
import { detectSafariPWA } from '@/utils/deviceDetection';

export function usePostLoginNotificationSetup() {
  const { user, profile } = useAuth();
  const { hasSeenWelcome } = useWelcome();
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  useEffect(() => {
    if (!user || !profile || !hasSeenWelcome) return;

    // After the reset, all users need to re-enable notifications
    // Show modal if user doesn't have active push subscriptions - ONLY after welcome animation
    const shouldShowModal = !profile.push_subscription_active || 
                           !profile.onesignal_player_id ||
                           profile.onesignal_subscription_status === 'unknown';

    if (shouldShowModal) {
      // Small delay after welcome animation completes
      const timer = setTimeout(() => {
        console.log('🎯 [Post-Login] Scheduling notification modal after welcome animation');
        setShowNotificationModal(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [user, profile, hasSeenWelcome]);

  const handleModalClose = () => {
    setShowNotificationModal(false);
  };

  const handleNotificationEnabled = () => {
    setShowNotificationModal(false);
  };

  return {
    showNotificationModal,
    handleModalClose,
    handleNotificationEnabled,
    isSafariPWA: detectSafariPWA()
  };
}
