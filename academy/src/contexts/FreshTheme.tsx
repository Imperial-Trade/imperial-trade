import React, { createContext, useContext, useEffect, useState } from 'react';

// Debug React import at module level
console.log('[FreshTheme Module] React import check:', {
  React: typeof React,
  useState: typeof useState,
  useEffect: typeof useEffect
});

type Theme = 'dark' | 'light';

interface FreshThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const FreshThemeContext = createContext<FreshThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
});

// Cache-busted theme provider without any external hooks
export function FreshThemeProvider({ children }: { children: React.ReactNode }) {
  console.log('[FreshThemeProvider] Starting completely fresh - no cache issues');
  console.log('[FreshThemeProvider] React availability check:', {
    React: typeof React,
    useState: typeof React?.useState,
    useEffect: typeof React?.useEffect,
    ReactObject: React
  });
  
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
      console.log('[FreshThemeProvider] Applied theme:', currentTheme);
    } catch {}
  }, [currentTheme]);

  const updateTheme = (newTheme: Theme) => {
    try {
      window.localStorage.setItem('theme', newTheme);
    } catch {}
    setCurrentTheme(newTheme);
  };

  const toggleTheme = () => {
    updateTheme(currentTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <FreshThemeContext.Provider value={{
      theme: currentTheme,
      setTheme: updateTheme,
      toggleTheme,
    }}>
      {children}
    </FreshThemeContext.Provider>
  );
}

export function useFreshTheme() {
  return useContext(FreshThemeContext);
}

// Legacy exports
export const useTheme = useFreshTheme;
export const ThemeProvider = FreshThemeProvider;