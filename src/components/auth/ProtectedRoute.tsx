
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

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // Check role if required
  if (requiredRole) {
    // Enhanced admin check with fallback logic
    const isAdmin = () => {
      if (profile) {
        return profile.access_level === 'admin' || profile.role === 'admin';
      }
      // Fallback to user metadata if profile doesn't exist or is incomplete
      const userAccessLevel = user?.user_metadata?.access_level;
      const userRole = user?.user_metadata?.role;
      return userAccessLevel === 'admin' || userRole === 'admin';
    };
    
    if (requiredRole === 'admin' && !isAdmin()) {
      return <Navigate to="/dashboard/home" replace />;
    }
  }

  return <>{children}</>;
};
