
import { useEffect, useCallback } from 'react';

interface KeyboardShortcutOptions {
  onToggleSidebar: () => void;
  onCloseSidebar: () => void;
  isEnabled: boolean;
}

export function useKeyboardShortcuts({
  onToggleSidebar,
  onCloseSidebar,
  isEnabled
}: KeyboardShortcutOptions) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isEnabled) return;

    // Toggle sidebar with Ctrl/Cmd + \
    if ((event.ctrlKey || event.metaKey) && event.key === '\\') {
      event.preventDefault();
      onToggleSidebar();
      return;
    }

    // Close sidebar with Escape
    if (event.key === 'Escape') {
      event.preventDefault();
      onCloseSidebar();
      return;
    }
  }, [onToggleSidebar, onCloseSidebar, isEnabled]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
