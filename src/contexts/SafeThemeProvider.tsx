import * as React from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
});

// Safer theme provider with explicit React namespace usage
export function SafeThemeProvider({ children }: { children: React.ReactNode }) {
  // Use React.useState explicitly to avoid import conflicts
  const [currentTheme, setCurrentTheme] = React.useState<Theme>(() => {
    try {
      const stored = window.localStorage.getItem('theme');
      return stored === 'light' || stored === 'dark' ? (stored as Theme) : 'dark';
    } catch {
      return 'dark';
    }
  });

  // Apply theme to DOM
  React.useEffect(() => {
    try {
      document.documentElement.classList.toggle('dark', currentTheme === 'dark');
      document.documentElement.classList.toggle('light', currentTheme === 'light');
    } catch (error) {
      console.error('Theme application error:', error);
    }
  }, [currentTheme]);

  const updateTheme = React.useCallback((newTheme: Theme) => {
    try {
      window.localStorage.setItem('theme', newTheme);
    } catch (error) {
      console.error('Theme storage error:', error);
    }
    setCurrentTheme(newTheme);
  }, []);

  const toggleTheme = React.useCallback(() => {
    updateTheme(currentTheme === 'dark' ? 'light' : 'dark');
  }, [currentTheme, updateTheme]);

  const value = React.useMemo(() => ({
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
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useSafeTheme must be used within SafeThemeProvider');
  }
  return context;
}

// Export as default theme system
export const ThemeProvider = SafeThemeProvider;
export const useTheme = useSafeTheme;