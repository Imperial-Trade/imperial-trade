
import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
  isCollapsed?: boolean;
}

export function ThemeToggle({ isCollapsed = false }: ThemeToggleProps) {
  const { theme, setTheme, actualTheme } = useTheme();

  const getThemeIcon = () => {
    if (theme === 'system') return <Monitor className="h-4 w-4" />;
    return actualTheme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />;
  };

  const getThemeLabel = () => {
    if (theme === 'system') return 'System';
    return actualTheme === 'dark' ? 'Dark' : 'Light';
  };

  if (isCollapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
          >
            {getThemeIcon()}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" side="right">
          <DropdownMenuItem onClick={() => setTheme('light')}>
            <Sun className="mr-2 h-4 w-4" />
            Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')}>
            <Moon className="mr-2 h-4 w-4" />
            Dark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('system')}>
            <Monitor className="mr-2 h-4 w-4" />
            System
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
        >
          {getThemeIcon()}
          <span className="ml-2 text-sm">{getThemeLabel()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
