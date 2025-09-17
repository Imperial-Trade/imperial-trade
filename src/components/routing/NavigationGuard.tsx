
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
      // Parse URL parameters once
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const searchParams = new URLSearchParams(window.location.search);
      
      // Check for password reset tokens first - bypass all redirect logic if found
      const hasRecoveryTokens = () => {
        // Check for recovery type in hash or search params
        const hashType = hashParams.get('type');
        const searchType = searchParams.get('type');
        
        // Check for various token formats
        const hasAccessToken = hashParams.has('access_token') || searchParams.has('access_token');
        const hasRefreshToken = hashParams.has('refresh_token') || searchParams.has('refresh_token');
        const hasTokenHash = hashParams.has('token_hash') || searchParams.has('token_hash');
        
        return hashType === 'recovery' || searchType === 'recovery' || hasAccessToken || hasRefreshToken || hasTokenHash;
      };

      // If we detect recovery tokens, bypass all redirect logic
      if (hasRecoveryTokens()) {
        console.log('🔐 NavigationGuard: Recovery tokens detected, bypassing redirect logic');
        console.log('📍 NavigationGuard: Token details:', {
          hashType: hashParams.get('type'),
          searchType: searchParams.get('type'),
          hasAccessToken: hashParams.has('access_token') || searchParams.has('access_token'),
          hasRefreshToken: hashParams.has('refresh_token') || searchParams.has('refresh_token'),
          hasTokenHash: hashParams.has('token_hash') || searchParams.has('token_hash'),
          currentPath: location.pathname
        });
        setNavigationError(null);
        return;
      }

      // If we're not loading and there's no user, but we're on a protected route
      if (!loading && !user && location.pathname.startsWith('/dashboard')) {
        // Save the intended destination
        const from = location.pathname + location.search;
        console.log("🚫 NavigationGuard: Redirecting unauthenticated user to signin");
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
