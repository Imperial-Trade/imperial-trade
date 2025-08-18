
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

    // Check dismissal flags first
    const sessionKey = `imperial_notify_modal_dismissed_session_${user.id}`;
    const ttlKey = `imperial_notify_modal_dismissed_at_${user.id}`;
    
    // Check session-based dismissal
    if (sessionStorage.getItem(sessionKey) === 'true') {
      console.log('🎯 [Post-Login] Modal dismissed for this session');
      return;
    }

    // Check TTL-based dismissal (24 hours)
    const dismissedAt = localStorage.getItem(ttlKey);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt);
      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      
      if (now - dismissedTime < twentyFourHours) {
        console.log('🎯 [Post-Login] Modal dismissed within last 24 hours');
        return;
      }
    }

    // Support bypass for testing/support
    const urlParams = new URLSearchParams(window.location.search);
    const forceShow = urlParams.get('notify') === '1';

    // Don't show modal if browser notification permission is already granted (unless forced)
    if (!forceShow && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      return;
    }

    // After the reset, all users need to re-enable notifications
    // Show modal if user doesn't have active push subscriptions - ONLY after welcome animation
    const shouldShowModal = forceShow || 
                           !profile.push_subscription_active || 
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
    
    // Set dismissal flags when modal is closed
    if (user?.id) {
      const sessionKey = `imperial_notify_modal_dismissed_session_${user.id}`;
      const ttlKey = `imperial_notify_modal_dismissed_at_${user.id}`;
      
      sessionStorage.setItem(sessionKey, 'true');
      localStorage.setItem(ttlKey, Date.now().toString());
      
      console.log('🎯 [Post-Login] Modal dismissed - flags set');
    }
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
