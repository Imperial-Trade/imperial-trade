import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';

interface XeonStreamContextValue {
  isSubscribed: boolean;
  canSubscribe: boolean;
  isLoading: boolean;
  subscribeToXeonStream: () => Promise<{ success: boolean; error?: string }>;
  unsubscribeFromXeonStream: () => Promise<{ success: boolean; error?: string }>;
  showOptInModal: boolean;
  setShowOptInModal: (show: boolean) => void;
}

const XeonStreamContext = createContext<XeonStreamContextValue | undefined>(undefined);

export const XeonStreamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, isXeonStreamSubscribed, updateXeonStreamSubscription } = useAuth();
  const { isGranted: hasNotificationPermission, requestPermission } = useNotifications();
  const [isLoading, setIsLoading] = useState(false);
  const [showOptInModal, setShowOptInModal] = useState(false);

  // Check if user can subscribe (authenticated + has notification permission)
  const canSubscribe = useMemo(() => {
    return !!(user && profile && hasNotificationPermission);
  }, [user, profile, hasNotificationPermission]);

  // Show opt-in modal if user is eligible but not subscribed
  useEffect(() => {
    if (user && profile && hasNotificationPermission && !isXeonStreamSubscribed) {
      // Small delay to allow other modals to clear
      const timer = setTimeout(() => {
        setShowOptInModal(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, profile, hasNotificationPermission, isXeonStreamSubscribed]);

  const subscribeToXeonStream = async (): Promise<{ success: boolean; error?: string }> => {
    if (!canSubscribe) {
      return { success: false, error: 'Prerequisites not met' };
    }

    setIsLoading(true);
    try {
      // First, ensure notification permissions are granted
      if (!hasNotificationPermission) {
        const permissionResult = await requestPermission();
        if (!permissionResult.success) {
          return { success: false, error: 'Notification permission required' };
        }
      }

      // In-app notification tagging (OneSignal removed)

      // Update database subscription status
      await updateXeonStreamSubscription(true);

      setShowOptInModal(false);
      return { success: true };
    } catch (error) {
      console.error('Error subscribing to Xeon Stream:', error);
      return { success: false, error: 'Failed to subscribe to Xeon Stream' };
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeFromXeonStream = async (): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      // In-app notification tag removal (OneSignal removed)

      // Update database subscription status
      await updateXeonStreamSubscription(false);

      return { success: true };
    } catch (error) {
      console.error('Error unsubscribing from Xeon Stream:', error);
      return { success: false, error: 'Failed to unsubscribe from Xeon Stream' };
    } finally {
      setIsLoading(false);
    }
  };

  const value = useMemo<XeonStreamContextValue>(() => ({
    isSubscribed: isXeonStreamSubscribed,
    canSubscribe,
    isLoading,
    subscribeToXeonStream,
    unsubscribeFromXeonStream,
    showOptInModal,
    setShowOptInModal,
  }), [isXeonStreamSubscribed, canSubscribe, isLoading, showOptInModal]);

  return (
    <XeonStreamContext.Provider value={value}>
      {children}
    </XeonStreamContext.Provider>
  );
};

export const useXeonStream = () => {
  const context = useContext(XeonStreamContext);
  if (!context) {
    throw new Error('useXeonStream must be used within XeonStreamProvider');
  }
  return context;
};