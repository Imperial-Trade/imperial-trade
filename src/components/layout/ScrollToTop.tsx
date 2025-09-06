import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function useSafeLocation() {
  try {
    return useLocation();
  } catch (error) {
    console.warn('ScrollToTop: Router context not available, skipping scroll-to-top functionality');
    return null;
  }
}

export function ScrollToTop() {
  const location = useSafeLocation();

  useEffect(() => {
    if (location) {
      // Scroll to top when route changes
      window.scrollTo(0, 0);
    }
  }, [location?.pathname]);

  return null;
}