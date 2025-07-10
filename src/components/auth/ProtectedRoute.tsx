
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
  if (requiredRole === 'admin') {
    const isAdmin = profile?.access_level === 'admin' || 
                   profile?.role === 'admin' || 
                   user?.user_metadata?.access_level === 'admin' || 
                   user?.user_metadata?.role === 'admin';
    
    if (!isAdmin) {
      return <Navigate to="/dashboard/home" replace />;
    }
  }

  return <>{children}</>;
};
