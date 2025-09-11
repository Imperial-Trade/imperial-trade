
import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from "@/contexts/SafeThemeProvider";

interface ThemeToggleProps {
  isCollapsed?: boolean;
}

export function ThemeToggle({ isCollapsed = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  const getThemeIcon = () => {
    return theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />;
  };

  const getThemeLabel = () => {
    return theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode';
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="w-8 h-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent"
      aria-label={getThemeLabel()}
    >
      {getThemeIcon()}
    </Button>
  );
}
