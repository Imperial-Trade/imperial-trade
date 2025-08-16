import React from 'react';
import TradingNotificationModal from './TradingNotificationModal';
import { usePostLoginNotificationSetup } from '@/hooks/usePostLoginNotificationSetup';
import { useOneSignalRecovery } from '@/hooks/useOneSignalRecovery';
import { useAuth } from '@/contexts/AuthContext';

const NotificationSetupManager: React.FC = () => {
  const { profile } = useAuth();
  const { needsRecovery } = useOneSignalRecovery();
  const {
    shouldShow,
    handleAccept,
    handleDecline,
    handleDismiss
  } = usePostLoginNotificationSetup();

  // Enhanced logic: Show if user needs recovery OR if it's their first time
  const shouldShowModal = shouldShow || (needsRecovery && !!profile);

  console.log('🎯 [Notification Setup] Manager state:', {
    shouldShow,
    needsRecovery,
    hasProfile: !!profile,
    shouldShowModal,
    userType: profile?.user_type
  });

  return (
    <TradingNotificationModal
      isOpen={shouldShowModal}
      onClose={handleDismiss}
      onAccept={handleAccept}
      onDecline={handleDecline}
    />
  );
};

export default NotificationSetupManager;