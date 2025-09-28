import React, { createContext, useContext, useState, useCallback } from 'react';

interface NavigationState {
  isNavigating: boolean;
  currentApp: string;
  targetApp?: string;
}

interface NavigationContextType {
  state: NavigationState;
  startNavigation: (targetApp: string) => void;
  completeNavigation: () => void;
  setCurrentApp: (app: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<NavigationState>({
    isNavigating: false,
    currentApp: 'main',
  });

  const startNavigation = useCallback((targetApp: string) => {
    setState(prev => ({
      ...prev,
      isNavigating: true,
      targetApp,
    }));
  }, []);

  const completeNavigation = useCallback(() => {
    setState(prev => ({
      ...prev,
      isNavigating: false,
      currentApp: prev.targetApp || prev.currentApp,
      targetApp: undefined,
    }));
  }, []);

  const setCurrentApp = useCallback((app: string) => {
    setState(prev => ({
      ...prev,
      currentApp: app,
    }));
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        state,
        startNavigation,
        completeNavigation,
        setCurrentApp,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}