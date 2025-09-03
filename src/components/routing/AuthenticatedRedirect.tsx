import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/layout/LoadingSpinner';

interface AuthenticatedRedirectProps {
  children: React.ReactNode;
}

export const AuthenticatedRedirect: React.FC<AuthenticatedRedirectProps> = ({ children }) => {
  const { user, loading } = useAuth();

  // Show loading spinner while auth is being determined
  if (loading) {
    return <LoadingSpinner />;
  }

  // If user is authenticated, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard/home" replace />;
  }

  // If not authenticated, show the landing content
  return <>{children}</>;
};