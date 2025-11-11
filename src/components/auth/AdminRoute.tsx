import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorizationAware } from '@/hooks/useAuthorizationAware';
import { useQueryClient } from '@tanstack/react-query';
import LoadingSpinner from '@/components/layout/LoadingSpinner';
import { AuthorizationError } from './AuthorizationError';

interface AdminRouteProps {
  children: ReactNode;
  allowedRoles?: ('admin' | 'moderator' | 'educator' | 'educator+' | 'user')[];
}

/**
 * ✅ SECURITY: Secure admin route protection using server-validated roles
 * Uses RPC-based validation to prevent privilege escalation attacks
 */
export const AdminRoute = ({ 
  children, 
  allowedRoles = ['admin'] 
}: AdminRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { userRoles, isLoading: rolesLoading, error } = useAuthorizationAware();
  const queryClient = useQueryClient();
  
  // Wait for both auth AND roles to finish loading
  if (authLoading || rolesLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/signin" replace />;
  
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
  
  // ✅ SECURITY FIX: Implement role hierarchy (consistent with ProtectedRoute)
  // Admins automatically have access to all routes
  const hasPrivilegedRole = userRoles?.some(role => 
    ['admin', 'moderator', 'educator', 'educator+'].includes(role)
  );

  const hasExactRole = allowedRoles.some(role => userRoles?.includes(role));

  // Grant access if user has either:
  // 1. The exact required role(s), OR
  // 2. Admin role (has access to everything)
  // 3. A higher privileged role in the hierarchy
  const hasAccess = hasExactRole || (
    // Admin has access to all routes
    (userRoles?.includes('admin')) ||
    // Moderator has access to educator and user routes
    (userRoles?.includes('moderator') && allowedRoles.some(r => ['educator', 'educator+', 'user'].includes(r))) ||
    // Educators have access to user routes
    (hasPrivilegedRole && allowedRoles.includes('user'))
  );

  // Debug logging
  console.log('[AdminRoute] Role Check:', {
    userRoles,
    allowedRoles,
    hasExactRole,
    hasPrivilegedRole,
    hasAccess
  });
  
  if (!hasAccess) return <Navigate to="/access-denied" replace />;
  
  return <>{children}</>;
};
