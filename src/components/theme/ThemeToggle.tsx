
import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
  isCollapsed?: boolean;
}

export function ThemeToggle({ isCollapsed = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  const getThemeIcon = () => {
    return theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />;
  };

  const getThemeLabel = () => {
    return theme === 'dark' ? 'Light' : 'Dark';
  };

  if (isCollapsed) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleTheme}
        className="w-full justify-center text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
        aria-label={`Switch to ${getThemeLabel()} mode`}
      >
        {getThemeIcon()}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="w-full justify-start text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
      aria-label={`Switch to ${getThemeLabel()} mode`}
    >
      {getThemeIcon()}
      <span className="ml-2 text-sm">{getThemeLabel()} Mode</span>
    </Button>
  );
}
