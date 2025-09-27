import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

interface SafeNavigationReturn {
  navigate: (to: string, options?: { replace?: boolean; state?: any }) => void;
  navigateToPage: (to: string) => void;
  isNavigationAvailable: boolean;
  navigationError: string | null;
}

export const useSafeNavigation = (): SafeNavigationReturn => {
  let navigate: ReturnType<typeof useNavigate> | null = null;
  let isNavigationAvailable = false;
  let navigationError: string | null = null;

  try {
    navigate = useNavigate();
    isNavigationAvailable = true;
  } catch (error) {
    console.warn('Navigation context not available:', error);
    navigationError = error instanceof Error ? error.message : 'Navigation context not available';
    isNavigationAvailable = false;
  }

  const safeNavigate = useCallback((to: string, options?: { replace?: boolean; state?: any }) => {
    if (navigate && isNavigationAvailable) {
      try {
        navigate(to, options);
      } catch (error) {
        console.error('Navigation failed:', error);
        // Fallback to window.location for emergency navigation
        if (options?.replace) {
          window.location.replace(to);
        } else {
          window.location.href = to;
        }
      }
    } else {
      console.warn('Navigation not available, using window.location fallback');
      // Fallback to window.location
      if (options?.replace) {
        window.location.replace(to);
      } else {
        window.location.href = to;
      }
    }
  }, [navigate, isNavigationAvailable]);

  const navigateToPage = useCallback((to: string) => {
    safeNavigate(to);
  }, [safeNavigate]);

  return {
    navigate: safeNavigate,
    navigateToPage,
    isNavigationAvailable,
    navigationError
  };
};