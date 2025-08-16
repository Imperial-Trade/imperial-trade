import React from 'react';
import TradingNotificationModal from './TradingNotificationModal';
import { usePostLoginNotificationSetup } from '@/hooks/usePostLoginNotificationSetup';

const NotificationSetupManager: React.FC = () => {
  const {
    shouldShow,
    handleAccept,
    handleDecline,
    handleDismiss
  } = usePostLoginNotificationSetup();

  return (
    <TradingNotificationModal
      isOpen={shouldShow}
      onClose={handleDismiss}
      onAccept={handleAccept}
      onDecline={handleDecline}
    />
  );
};

export default NotificationSetupManager;