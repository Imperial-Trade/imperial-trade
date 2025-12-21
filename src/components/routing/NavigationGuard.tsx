
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import LoadingSpinner from '@/components/layout/LoadingSpinner';

interface NavigationGuardProps {
  children: React.ReactNode;
}

export const NavigationGuard: React.FC<NavigationGuardProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [hasTimeout, setHasTimeout] = useState(false);
  const [navigationError, setNavigationError] = useState<string | null>(null);

  // Add timeout for loading states
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setHasTimeout(true);
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      setHasTimeout(false);
    }
  }, [loading]);

  useEffect(() => {
    try {
      // Parse URL parameters once
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const searchParams = new URLSearchParams(window.location.search);
      
      // Handle /verify endpoint redirects (when Supabase redirects from email links)
      if (location.pathname === '/reset-password' && 
          (searchParams.has('error') || hashParams.has('error') || 
           document.referrer.includes('/verify') ||
           sessionStorage.getItem('supabase_verify_redirect'))) {
        console.log('🔄 NavigationGuard: Detected redirect from /verify endpoint');
        sessionStorage.setItem('verify_redirect', 'true');
        sessionStorage.removeItem('supabase_verify_redirect');
      }
      

      // ✅ FIX: Don't redirect dashboard routes - let ProtectedRoute handle authentication
      // NavigationGuard should NOT interfere with ProtectedRoute's authentication checks
      // ProtectedRoute will properly handle redirects for unauthenticated users
      // Only handle non-dashboard routes or edge cases here
      // Dashboard routes are all protected by ProtectedRoute, so they will handle auth checks
      
      // List of public routes that don't require authentication
      const publicRoutes = [
        '/signin', 
        '/signup', 
        '/reset-password', 
        '/verify', 
        '/',
        '/advanced-tools',
        '/signals',
        '/education',
        '/live-sessions',
        '/community-forum',
        '/ib-partnership',
        '/ib-partnership-new',
        '/imperial-partnership',
        '/features',
        '/about',
        '/legal/disclaimers',
        '/legal/terms',
        '/legal/privacy',
        '/account-request',
        '/account-request-status'
      ];
      const isPublicRoute = publicRoutes.some(route => 
        location.pathname === route || 
        location.pathname.startsWith(route + '/')
      );
      
      if (!loading && !hasTimeout && !user && !location.pathname.startsWith('/dashboard') && !isPublicRoute) {
        // Only redirect non-dashboard routes that aren't protected and aren't public routes
        // Dashboard routes are handled by ProtectedRoute
        const from = location.pathname + location.search;
        console.log("🚫 NavigationGuard: Redirecting unauthenticated user to signin (non-dashboard route)");
        console.log("📍 NavigationGuard: From location:", from);
        navigate('/signin', { 
          state: { from }, 
          replace: true 
        });
      }
      setNavigationError(null);
    } catch (error) {
      console.error('Navigation error:', error);
      setNavigationError(error instanceof Error ? error.message : 'Navigation failed');
    }
  }, [user, loading, location, navigate]);

  return (
    <div data-current-component="NavigationGuard">
      {/* Show error if navigation failed */}
      {navigationError ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-2">Navigation Error</h2>
            <p className="text-muted-foreground mb-4">{navigationError}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-primary text-primary-foreground rounded"
            >
              Refresh Page
            </button>
          </div>
        </div>
      ) : loading && !hasTimeout ? (
        <LoadingSpinner />
      ) : (
        <>{children}</>
      )}
    </div>
  );
};
