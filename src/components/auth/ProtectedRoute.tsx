
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
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // Check role if required
  if (requiredRole) {
    const userRole = user.user_metadata?.access_level as string;
    
    if (requiredRole === 'admin' && userRole !== 'admin') {
      return <Navigate to="/dashboard/home" replace />;
    }
  }

  return <>{children}</>;
};
