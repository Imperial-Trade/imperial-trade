// 🚫 ROUTE-BASED MONITORING GATE
// Prevents unnecessary monitoring on landing page routes

import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';

// Routes where monitoring should be DISABLED to save costs
const MONITORING_DISABLED_ROUTES = [
  '/',                    // Landing page
  '/about',              // About page
  '/features',           // Features page
  '/signals',            // Public signals page
  '/education',          // Public education page
  '/live-sessions',      // Public live sessions page
  '/community-forum',    // Public forum page
  '/ib-partnership',     // IB partnership pages
  '/ib-partnership-new',
  '/imperial-partnership',
  '/advanced-tools',     // Public advanced tools page
  '/signin',             // Sign in page
  '/account-request',    // Account request page
  '/account-request-status',
  '/reset-password',     // Password reset page
  '/legal/',             // Legal pages (starts with)
];

export const useMonitoringRouteGate = () => {
  let location = null;
  
  try {
    location = useLocation();
  } catch (error) {
    console.warn('useMonitoringRouteGate: Router context not available, defaulting to monitoring disabled');
    // Default to safe behavior - disable monitoring when no router context
    return {
      shouldEnableMonitoring: false,
      currentRoute: '/',
      isLandingPage: true,
      isDashboard: false
    };
  }
  
  const shouldEnableMonitoring = useMemo(() => {
    if (!location) return false;
    const currentPath = location.pathname;
    
    // Check exact matches first
    if (MONITORING_DISABLED_ROUTES.includes(currentPath)) {
      return false;
    }
    
    // Check prefix matches (like /legal/)
    if (MONITORING_DISABLED_ROUTES.some(route => 
      route.endsWith('/') && currentPath.startsWith(route)
    )) {
      return false;
    }
    
    // Enable monitoring for dashboard routes and other protected areas
    return currentPath.startsWith('/dashboard') || currentPath.startsWith('/admin');
  }, [location?.pathname]);
  
  return {
    shouldEnableMonitoring,
    currentRoute: location?.pathname || '/',
    isLandingPage: location?.pathname === '/' || false,
    isDashboard: location?.pathname?.startsWith('/dashboard') || false
  };
};

export default useMonitoringRouteGate;