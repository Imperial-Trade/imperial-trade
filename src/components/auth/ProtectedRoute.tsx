
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorizationAware } from '@/hooks/useAuthorizationAware';
import { useQueryClient } from '@tanstack/react-query';
import LoadingSpinner from '@/components/layout/LoadingSpinner';
import { AuthorizationError } from './AuthorizationError';

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
  const { userRoles, isLoading: rolesLoading, error } = useAuthorizationAware();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Wait for both auth AND roles to finish loading
  if (authLoading || rolesLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/signin" state={{ from: location.pathname + location.search }} replace />;
  
  // Show error UI if role fetching failed
  if (error) {
    return (
      <AuthorizationError 
        error={error}
        onRetry={() => {
          queryClient.invalidateQueries({ queryKey: ['user-roles', user?.id] });
        }}
      />
    );
  }
  
  // Check if user has any of the required roles (server-validated)
  const hasAccess = requiredRoles.some(role => userRoles?.includes(role));
  
  if (!hasAccess) return <Navigate to="/access-denied" replace />;
  
  return <>{children}</>;
};
