
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { detectSafariPWA } from '@/utils/deviceDetection';

export function usePostLoginNotificationSetup() {
  const { user, profile } = useAuth();
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;

    // After the reset, all users need to re-enable notifications
    // Show modal if user doesn't have active push subscriptions
    const shouldShowModal = !profile.push_subscription_active || 
                           !profile.onesignal_player_id ||
                           profile.onesignal_subscription_status === 'unknown';

    if (shouldShowModal) {
      // Small delay to let the dashboard load first
      const timer = setTimeout(() => {
        setShowNotificationModal(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [user, profile]);

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
