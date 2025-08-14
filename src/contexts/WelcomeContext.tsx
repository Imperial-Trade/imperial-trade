import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface WelcomeContextType {
  hasSeenWelcome: boolean;
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
  const [hasSeenWelcome, setHasSeenWelcome] = useState(true); // Default to true to prevent flash

  useEffect(() => {
    if (user?.id) {
      const welcomeKey = `imperial_welcome_session_${user.id}`;
      const storedValue = localStorage.getItem(welcomeKey);
      
      if (storedValue === 'true') {
        setHasSeenWelcome(true);
      } else {
        // Fallback: Check old welcome key for backward compatibility
        const oldWelcomeKey = `welcome_shown_${user.id}`;
        const oldStoredValue = localStorage.getItem(oldWelcomeKey);
        
        if (oldStoredValue === 'true') {
          setHasSeenWelcome(true);
          // Migrate to new key
          localStorage.setItem(welcomeKey, 'true');
        } else {
          setHasSeenWelcome(false);
        }
      }
    } else {
      setHasSeenWelcome(true); // No user, don't show welcome
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
      markWelcomeAsSeen,
      resetWelcomeForNewSession
    }}>
      {children}
    </WelcomeContext.Provider>
  );
};