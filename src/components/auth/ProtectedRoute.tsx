
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/layout/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, loading, profile } = useAuth();

  // Only show loading spinner if we truly don't know the auth state yet
  // Don't wait for profile data to load
  if (loading && !user) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // Check role if required - only redirect if we explicitly know they don't have access
  if (requiredRole === 'admin') {
    const isAdmin = profile?.access_level === 'admin' || 
                   profile?.role === 'admin' || 
                   user?.user_metadata?.access_level === 'admin' || 
                   user?.user_metadata?.role === 'admin';
    
    // Only redirect if we have profile data and they're not admin
    // If profile is still loading, allow through (admin check can happen later)
    if (profile && !isAdmin) {
      return <Navigate to="/dashboard/home" replace />;
    }
  }

  return <>{children}</>;
};
