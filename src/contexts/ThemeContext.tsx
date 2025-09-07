
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const defaultContext: ThemeContextType = {
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
};

const ThemeContext = createContext<ThemeContextType>(defaultContext);

function getStoredTheme(): Theme {
  try {
    const t = window.localStorage.getItem('theme');
    return t === 'light' || t === 'dark' ? (t as Theme) : 'dark';
  } catch {
    return 'dark';
  }
}

function applyTheme(theme: Theme) {
  try {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');
  } catch {}
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  console.log('[ThemeProvider] Starting - No useLocalStorage called');
  const [theme, setThemeState] = useState<Theme>(() => {
    console.log('[ThemeProvider] Initializing theme state');
    return getStoredTheme();
  });

  useEffect(() => {
    applyTheme(theme);
    console.log('[ThemeProvider] applied theme', theme);
  }, [theme]);

  const setTheme = (next: Theme) => {
    try {
      window.localStorage.setItem('theme', next);
    } catch {}
    setThemeState(next);
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  // Safe: returns defaultContext if no provider
  return useContext(ThemeContext);
}
