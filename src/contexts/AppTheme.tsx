import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeMode = 'dark' | 'light';

interface AppThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const AppThemeContext = createContext<AppThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
});

// Get theme from localStorage safely
function getStoredThemeMode(): ThemeMode {
  try {
    const stored = window.localStorage.getItem('theme');
    return stored === 'light' || stored === 'dark' ? (stored as ThemeMode) : 'dark';
  } catch {
    return 'dark';
  }
}

// Apply theme classes to document
function applyThemeToDOM(theme: ThemeMode) {
  try {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
  } catch {}
}

// NEW THEME PROVIDER - NO useLocalStorage hook
export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  console.log('[AppThemeProvider] Initializing - cache busted version');
  
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    console.log('[AppThemeProvider] Getting stored theme');
    return getStoredThemeMode();
  });

  // Apply theme to DOM when it changes
  useEffect(() => {
    applyThemeToDOM(themeMode);
    console.log('[AppThemeProvider] Applied theme to DOM:', themeMode);
  }, [themeMode]);

  // Update theme and persist to localStorage
  const changeTheme = (newTheme: ThemeMode) => {
    try {
      window.localStorage.setItem('theme', newTheme);
    } catch {}
    setThemeMode(newTheme);
  };

  // Toggle between light and dark
  const toggleThemeMode = () => {
    changeTheme(themeMode === 'dark' ? 'light' : 'dark');
  };

  const contextValue: AppThemeContextType = {
    theme: themeMode,
    setTheme: changeTheme,
    toggleTheme: toggleThemeMode,
  };

  return (
    <AppThemeContext.Provider value={contextValue}>
      {children}
    </AppThemeContext.Provider>
  );
}

// Hook to use theme context
export function useAppTheme() {
  return useContext(AppThemeContext);
}

// Legacy export for compatibility
export const useTheme = useAppTheme;
export const ThemeProvider = AppThemeProvider;