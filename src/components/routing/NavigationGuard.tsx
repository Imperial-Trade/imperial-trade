
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
    // If we're not loading and there's no user, but we're on a protected route
    if (!loading && !user && location.pathname.startsWith('/dashboard')) {
      // Save the intended destination
      const from = location.pathname + location.search;
      navigate('/signin', { 
        state: { from }, 
        replace: true 
      });
    }
  }, [user, loading, location, navigate]);

  // Show loading spinner while auth is being determined
  if (loading) {
    return <LoadingSpinner />;
  }

  return <>{children}</>;
};
