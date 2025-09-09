
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
      // If we're not loading and there's no user, but we're on a protected route
      if (!loading && !user && location.pathname.startsWith('/dashboard')) {
        // Save the intended destination
        const from = location.pathname + location.search;
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
