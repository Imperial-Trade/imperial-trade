import React, { useEffect } from 'react';
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
      // Scroll to top when route changes
      window.scrollTo(0, 0);
    }
  }, [location?.pathname]);

  return null;
}