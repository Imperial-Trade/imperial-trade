import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface NotificationPromptContextType {
  hasSeenNotificationPrompt: boolean;
  markNotificationPromptAsSeen: () => void;
  resetNotificationPromptForNewSession: () => void;
  shouldShowNotificationPrompt: boolean;
  setShouldShowNotificationPrompt: (show: boolean) => void;
  isSubscribedToPush: boolean;
}

const NotificationPromptContext = createContext<NotificationPromptContextType | undefined>(undefined);

export const useNotificationPrompt = () => {
  const context = useContext(NotificationPromptContext);
  if (context === undefined) {
    throw new Error('useNotificationPrompt must be used within a NotificationPromptProvider');
  }
  return context;
};

export const NotificationPromptProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [hasSeenNotificationPrompt, setHasSeenNotificationPrompt] = useState(true); // Default to true to prevent flash
  const [shouldShowNotificationPrompt, setShouldShowNotificationPrompt] = useState(false);
  const [isSubscribedToPush, setIsSubscribedToPush] = useState(false);

  useEffect(() => {
    if (user?.id) {
      const promptKey = `imperial_notification_prompt_${user.id}`;
      const subscriptionKey = `imperial_push_subscribed_${user.id}`;
      const storedPromptValue = localStorage.getItem(promptKey);
      const storedSubscriptionValue = localStorage.getItem(subscriptionKey);
      
      // Check if user has subscribed to push notifications
      const isSubscribed = storedSubscriptionValue === 'true';
      setIsSubscribedToPush(isSubscribed);
      
      // Only mark as seen if user has actually subscribed
      if (isSubscribed) {
        setHasSeenNotificationPrompt(true);
      } else {
        setHasSeenNotificationPrompt(false);
      }
    } else {
      setHasSeenNotificationPrompt(true); // No user, don't show prompt
      setIsSubscribedToPush(false);
    }
  }, [user?.id]);

  const markNotificationPromptAsSeen = () => {
    if (user?.id) {
      const promptKey = `imperial_notification_prompt_${user.id}`;
      const subscriptionKey = `imperial_push_subscribed_${user.id}`;
      
      // Mark both prompt as seen and subscription as active
      localStorage.setItem(promptKey, 'true');
      localStorage.setItem(subscriptionKey, 'true');
      
      setHasSeenNotificationPrompt(true);
      setIsSubscribedToPush(true);
      setShouldShowNotificationPrompt(false);
    }
  };

  const resetNotificationPromptForNewSession = () => {
    if (user?.id) {
      const promptKey = `imperial_notification_prompt_${user.id}`;
      localStorage.removeItem(promptKey);
      setHasSeenNotificationPrompt(false);
    }
  };

  return (
    <NotificationPromptContext.Provider value={{
      hasSeenNotificationPrompt,
      markNotificationPromptAsSeen,
      resetNotificationPromptForNewSession,
      shouldShowNotificationPrompt,
      setShouldShowNotificationPrompt,
      isSubscribedToPush
    }}>
      {children}
    </NotificationPromptContext.Provider>
  );
};