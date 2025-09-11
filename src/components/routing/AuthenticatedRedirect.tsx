import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/layout/LoadingSpinner';

interface AuthenticatedRedirectProps {
  children: React.ReactNode;
}

export const AuthenticatedRedirect: React.FC<AuthenticatedRedirectProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const [hasTimeout, setHasTimeout] = useState(false);

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

  // If user is authenticated, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard/home" replace />;
  }

  // If not authenticated or timeout reached, show the landing content
  return (
    <div data-current-component="AuthenticatedRedirect-Content">
      {children}
    </div>
  );
};