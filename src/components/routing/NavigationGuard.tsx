
import React, { useEffect } from 'react';
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

  useEffect(() => {
    if (loading) return; // Wait for auth to be determined
    
    // If user is authenticated but on signin page, redirect to dashboard
    if (user && location.pathname === '/signin') {
      navigate('/dashboard/home', { replace: true });
      return;
    }
    
    // If we're not loading and there's no user, but we're on a protected route
    if (!user && location.pathname.startsWith('/dashboard')) {
      // Save the intended destination in sessionStorage for reliable retrieval
      const from = location.pathname + location.search;
      sessionStorage.setItem('auth_redirect_after_login', from);
      navigate('/signin', { replace: true });
    }
  }, [user, loading, location, navigate]);

  // Show loading spinner while auth is being determined
  if (loading) {
    return <LoadingSpinner />;
  }

  return <>{children}</>;
};
