import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/layout/LoadingSpinner';

interface AuthenticatedRedirectProps {
  children: React.ReactNode;
}

export const AuthenticatedRedirect: React.FC<AuthenticatedRedirectProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const [hasTimeout, setHasTimeout] = useState(false);
  const location = useLocation();

  // Routes that should not redirect authenticated users
  const excludedPaths = ['/reset-password', '/signin'];
  const isExcludedPath = excludedPaths.some(path => location.pathname.startsWith(path));

  // Add timeout for loading states to prevent infinite loading
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setHasTimeout(true);
      }, 5000); // 5 second timeout

      return () => clearTimeout(timer);
    } else {
      setHasTimeout(false);
    }
  }, [loading]);

  // Show loading spinner while auth is being determined, unless timeout
  if (loading && !hasTimeout) {
    return (
      <div data-current-component="AuthenticatedRedirect">
        <LoadingSpinner />
      </div>
    );
  }

  // If user is authenticated and not on excluded path, redirect to dashboard
  if (user && !isExcludedPath) {
    return <Navigate to="/dashboard/home" replace />;
  }

  // If not authenticated, timeout reached, or on excluded path, show the content
  return (
    <div data-current-component="AuthenticatedRedirect-Content">
      {children}
    </div>
  );
};