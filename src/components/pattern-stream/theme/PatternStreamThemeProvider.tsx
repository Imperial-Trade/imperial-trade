import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

type PatternStreamTheme = "dark" | "light";

interface PatternStreamThemeContextValue {
  theme: PatternStreamTheme;
  setTheme: (next: PatternStreamTheme) => void;
  toggle: () => void;
}

const PatternStreamThemeContext = createContext<PatternStreamThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "ps-theme";

function readInitialTheme(): PatternStreamTheme {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // ignore - localStorage may be blocked
  }
  return "dark";
}

interface ProviderProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wraps a Pattern Stream subtree and applies the design tokens via
 * a `data-ps-root` attribute. Inside this wrapper, all components
 * use the Liquid Glass + monochrome + green design system.
 */
export function PatternStreamThemeProvider({ children, className }: ProviderProps) {
  const [theme, setThemeState] = useState<PatternStreamTheme>(() => readInitialTheme());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const value = useMemo<PatternStreamThemeContextValue>(
    () => ({
      theme,
      setTheme: setThemeState,
      toggle: () => setThemeState((prev) => (prev === "dark" ? "light" : "dark")),
    }),
    [theme],
  );

  return (
    <PatternStreamThemeContext.Provider value={value}>
      <div data-ps-root={theme} className={className}>
        {children}
      </div>
    </PatternStreamThemeContext.Provider>
  );
}

export function usePatternStreamTheme(): PatternStreamThemeContextValue {
  const ctx = useContext(PatternStreamThemeContext);
  if (!ctx) {
    throw new Error("usePatternStreamTheme must be used within a PatternStreamThemeProvider");
  }
  return ctx;
}
