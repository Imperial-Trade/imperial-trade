import { useMemo } from 'react';
import { useTheme } from '@/contexts/SafeThemeProvider';
import { getSignalColors } from '@/lib/design-system/signalColors';

/**
 * Custom hook for accessing theme-aware Signal Stream colors.
 * Automatically switches between dark and light color palettes.
 */
export const useSignalTheme = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const colors = useMemo(() => getSignalColors(isDark), [isDark]);
  
  return {
    colors,
    isDark,
    theme,
  };
};
