
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorizationAware } from '@/hooks/useAuthorizationAware';
import LoadingSpinner from '@/components/layout/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: ('admin' | 'moderator' | 'educator' | 'educator+' | 'user')[];
}

/**
 * ✅ SECURITY FIX: Secure route protection using server-validated roles
 * Replaces insecure client-side metadata checks with RPC-based validation
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRoles = ['user']
}) => {
  const { user, loading: authLoading } = useAuth();
  const { userRoles, isLoading: rolesLoading } = useAuthorizationAware();
  const location = useLocation();

  // Wait for both auth AND roles to finish loading
  if (authLoading || rolesLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/signin" state={{ from: location.pathname + location.search }} replace />;
  
  // Check if user has any of the required roles (server-validated)
  const hasAccess = requiredRoles.some(role => userRoles?.includes(role));
  
  if (!hasAccess) return <Navigate to="/access-denied" replace />;
  
  return <>{children}</>;
};
