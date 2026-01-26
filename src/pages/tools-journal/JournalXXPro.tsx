import React from 'react';
import { JournalXXPro as JournalXXProComponent } from '@/components/journal-xx/JournalXXPro';
import { useTheme } from '@/contexts/SafeThemeProvider';

export default function JournalXXProPage() {
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';

  const handleExit = () => {
    window.history.back();
  };

  return (
    <JournalXXProComponent
      isDarkMode={isDarkMode}
      onExit={handleExit}
      onToggleTheme={toggleTheme}
    />
  );
}
