import React, { createContext, useState, useEffect, useCallback, useMemo, useContext, ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
});

// Theme provider with standardized React imports
export function SafeThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    try {
      const stored = window.localStorage.getItem('theme');
      return stored === 'light' || stored === 'dark' ? (stored as Theme) : 'dark';
    } catch {
      return 'dark';
    }
  });

  // Apply theme to DOM
  useEffect(() => {
    try {
      document.documentElement.classList.toggle('dark', currentTheme === 'dark');
      document.documentElement.classList.toggle('light', currentTheme === 'light');
    } catch (error) {
      console.error('Theme application error:', error);
    }
  }, [currentTheme]);

  const updateTheme = useCallback((newTheme: Theme) => {
    try {
      window.localStorage.setItem('theme', newTheme);
    } catch (error) {
      console.error('Theme storage error:', error);
    }
    setCurrentTheme(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    updateTheme(currentTheme === 'dark' ? 'light' : 'dark');
  }, [currentTheme, updateTheme]);

  const value = useMemo(() => ({
    theme: currentTheme,
    setTheme: updateTheme,
    toggleTheme,
  }), [currentTheme, updateTheme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useSafeTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useSafeTheme must be used within SafeThemeProvider');
  }
  return context;
}

// Export as default theme system
export const ThemeProvider = SafeThemeProvider;
export const useTheme = useSafeTheme;