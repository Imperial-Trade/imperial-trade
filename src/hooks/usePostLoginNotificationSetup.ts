// Fallback hook - OneSignal removed
import { useState } from 'react';

export function usePostLoginNotificationSetup() {
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  return {
    showNotificationModal,
    handleModalClose: () => setShowNotificationModal(false),
    handleNotificationEnabled: () => setShowNotificationModal(false),
    isSafariPWA: false,
    // Legacy properties for backward compatibility
    showModal: showNotificationModal,
    setShowModal: setShowNotificationModal,
    needsNotifications: false,
    notificationModalSettings: {
      show: false,
      priority: 'normal' as const
    }
  };
}