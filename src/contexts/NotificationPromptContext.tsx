import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface NotificationPromptContextType {
  hasSeenNotificationPrompt: boolean;
  markNotificationPromptAsSeen: () => void;
  markNotificationPromptAsSessionDismissed: () => void;
  resetNotificationPromptForNewSession: () => void;
  shouldShowNotificationPrompt: boolean;
  setShouldShowNotificationPrompt: (show: boolean) => void;
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

  useEffect(() => {
    if (user?.id) {
      const permanentKey = `imperial_notification_permanent_${user.id}`;
      const sessionKey = `imperial_notification_session_${user.id}`;
      
      const isPermanentlyDismissed = localStorage.getItem(permanentKey) === 'true';
      const isSessionDismissed = localStorage.getItem(sessionKey) === 'true';
      
      if (isPermanentlyDismissed || isSessionDismissed) {
        setHasSeenNotificationPrompt(true);
      } else {
        setHasSeenNotificationPrompt(false);
      }
    } else {
      setHasSeenNotificationPrompt(true); // No user, don't show prompt
    }
  }, [user?.id]);

  const markNotificationPromptAsSeen = () => {
    if (user?.id) {
      const permanentKey = `imperial_notification_permanent_${user.id}`;
      localStorage.setItem(permanentKey, 'true');
      setHasSeenNotificationPrompt(true);
      setShouldShowNotificationPrompt(false);
    }
  };

  const markNotificationPromptAsSessionDismissed = () => {
    if (user?.id) {
      const sessionKey = `imperial_notification_session_${user.id}`;
      localStorage.setItem(sessionKey, 'true');
      setHasSeenNotificationPrompt(true);
      setShouldShowNotificationPrompt(false);
    }
  };

  const resetNotificationPromptForNewSession = () => {
    if (user?.id) {
      const sessionKey = `imperial_notification_session_${user.id}`;
      localStorage.removeItem(sessionKey);
      // Only reset if not permanently dismissed
      const permanentKey = `imperial_notification_permanent_${user.id}`;
      const isPermanentlyDismissed = localStorage.getItem(permanentKey) === 'true';
      if (!isPermanentlyDismissed) {
        setHasSeenNotificationPrompt(false);
      }
    }
  };

  return (
    <NotificationPromptContext.Provider value={{
      hasSeenNotificationPrompt,
      markNotificationPromptAsSeen,
      markNotificationPromptAsSessionDismissed,
      resetNotificationPromptForNewSession,
      shouldShowNotificationPrompt,
      setShouldShowNotificationPrompt
    }}>
      {children}
    </NotificationPromptContext.Provider>
  );
};