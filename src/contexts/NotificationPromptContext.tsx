import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface NotificationPromptContextType {
  hasSeenNotificationPrompt: boolean;
  markNotificationPromptAsSeen: () => void;
  resetNotificationPromptForNewSession: () => void;
  shouldShowNotificationPrompt: boolean;
  setShouldShowNotificationPrompt: (show: boolean) => void;
}

const NotificationPromptContext = createContext<NotificationPromptContextType | undefined>(undefined);

export const useNotificationPrompt = () => {
  const context = useContext(NotificationPromptContext);
  if (context === undefined) {
    // Fail-safe: do not crash app if provider isn't mounted yet
    console.warn('useNotificationPrompt used outside NotificationPromptProvider – returning safe defaults');
    return {
      hasSeenNotificationPrompt: true,
      markNotificationPromptAsSeen: () => {},
      resetNotificationPromptForNewSession: () => {},
      shouldShowNotificationPrompt: false,
      setShouldShowNotificationPrompt: () => {},
    } as const;
  }
  return context;
};

export const NotificationPromptProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [hasSeenNotificationPrompt, setHasSeenNotificationPrompt] = useState(true); // Default to true to prevent flash
  const [shouldShowNotificationPrompt, setShouldShowNotificationPrompt] = useState(false);

  useEffect(() => {
    if (user?.id) {
      const promptKey = `imperial_notification_prompt_${user.id}`;
      const storedValue = localStorage.getItem(promptKey);
      
      if (storedValue === 'true') {
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
      const promptKey = `imperial_notification_prompt_${user.id}`;
      localStorage.setItem(promptKey, 'true');
      setHasSeenNotificationPrompt(true);
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
      setShouldShowNotificationPrompt
    }}>
      {children}
    </NotificationPromptContext.Provider>
  );
};