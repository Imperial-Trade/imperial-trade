import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollToTop() {
  let location = null;
  
  try {
    location = useLocation();
  } catch (error) {
    console.warn('ScrollToTop: Router context not available, skipping scroll-to-top functionality');
    return null;
  }

  useEffect(() => {
    if (location) {
      window.scrollTo(0, 0);
      const scrollRoot = document.querySelector('[data-scroll-root]');
      if (scrollRoot) scrollRoot.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [location?.pathname]);

  return null;
}