import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface WelcomeContextType {
  hasSeenWelcome: boolean;
  isReady: boolean;
  markWelcomeAsSeen: () => void;
  resetWelcomeForNewSession: () => void;
}

const WelcomeContext = createContext<WelcomeContextType | undefined>(undefined);

export const useWelcome = () => {
  const context = useContext(WelcomeContext);
  if (context === undefined) {
    throw new Error('useWelcome must be used within a WelcomeProvider');
  }
  return context;
};

export const WelcomeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (user?.id) {
      const welcomeKey = `imperial_welcome_session_${user.id}`;
      const storedValue = localStorage.getItem(welcomeKey);
      setHasSeenWelcome(storedValue === 'true');
      setIsReady(true);
    } else {
      setHasSeenWelcome(true); // No user, don't show welcome
      setIsReady(true);
    }
  }, [user?.id]);

  const markWelcomeAsSeen = () => {
    if (user?.id) {
      const welcomeKey = `imperial_welcome_session_${user.id}`;
      localStorage.setItem(welcomeKey, 'true');
      setHasSeenWelcome(true);
    }
  };

  const resetWelcomeForNewSession = () => {
    if (user?.id) {
      const welcomeKey = `imperial_welcome_session_${user.id}`;
      localStorage.removeItem(welcomeKey);
      setHasSeenWelcome(false);
    }
  };

  return (
    <WelcomeContext.Provider value={{
      hasSeenWelcome,
      isReady,
      markWelcomeAsSeen,
      resetWelcomeForNewSession
    }}>
      {children}
    </WelcomeContext.Provider>
  );
};