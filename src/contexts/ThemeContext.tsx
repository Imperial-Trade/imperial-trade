import React, { createContext, useContext, useEffect, useState } from 'react';

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

// Utility functions
function getInitialTheme(): Theme {
  try {
    const stored = window.localStorage.getItem('theme');
    return stored === 'light' || stored === 'dark' ? (stored as Theme) : 'dark';
  } catch {
    return 'dark';
  }
}

function updateDOMTheme(theme: Theme) {
  try {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
  } catch {}
}

// NEW CACHE-BUSTED THEME PROVIDER
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  console.log('[NEW ThemeProvider v2] Starting without useLocalStorage');
  
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    console.log('[NEW ThemeProvider v2] Getting initial theme');
    return getInitialTheme();
  });

  // Apply theme to DOM
  useEffect(() => {
    updateDOMTheme(currentTheme);
    console.log('[NEW ThemeProvider v2] Applied theme:', currentTheme);
  }, [currentTheme]);

  // Theme setter with localStorage
  const updateTheme = (newTheme: Theme) => {
    try {
      window.localStorage.setItem('theme', newTheme);
    } catch {}
    setCurrentTheme(newTheme);
  };

  // Theme toggler
  const toggleCurrentTheme = () => {
    updateTheme(currentTheme === 'dark' ? 'light' : 'dark');
  };

  const contextValue: ThemeContextType = {
    theme: currentTheme,
    setTheme: updateTheme,
    toggleTheme: toggleCurrentTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}