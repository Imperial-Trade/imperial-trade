
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
  
  // ✅ SECURITY FIX: Implement role hierarchy
  // Admins, moderators, and educators automatically have 'user' access
  const hasPrivilegedRole = userRoles?.some(role => 
    ['admin', 'moderator', 'educator', 'educator+'].includes(role)
  );

  const hasExactRole = requiredRoles.some(role => userRoles?.includes(role));

  // Grant access if user has either:
  // 1. The exact required role(s), OR
  // 2. A privileged role (which includes 'user' permissions)
  const hasAccess = hasExactRole || (requiredRoles.includes('user') && hasPrivilegedRole);

  // Debug logging
  console.log('[ProtectedRoute] Role Check:', {
    userRoles,
    requiredRoles,
    hasExactRole,
    hasPrivilegedRole,
    hasAccess,
    currentPath: location.pathname
  });
  
  if (!hasAccess) return <Navigate to="/access-denied" replace />;
  
  return <>{children}</>;
};
