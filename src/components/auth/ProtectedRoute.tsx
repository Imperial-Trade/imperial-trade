
import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorizationAware } from '@/hooks/useAuthorizationAware';
import { useQueryClient } from '@tanstack/react-query';
import LoadingSpinner from '@/components/layout/LoadingSpinner';
import { AuthorizationError } from './AuthorizationError';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: ('admin' | 'moderator' | 'educator' | 'educator+' | 'user')[];
}

/**
 * ✅ SECURITY FIX: Secure route protection using server-validated roles
 * Replaces insecure client-side metadata checks with RPC-based validation
 */
export const ProtectedRoute = ({ 
  children, 
  requiredRoles = ['user']
}: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { userRoles, isLoading: rolesLoading, error } = useAuthorizationAware();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Wait for both auth AND roles to finish loading
  if (authLoading || rolesLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/signin" state={{ from: location.pathname + location.search }} replace />;
  
  // ✅ FIX: If role fetching failed but user is authenticated, grant default access
  // This prevents blocking users due to temporary network/database issues
  // Only show error UI if we're on a route that requires specific roles (not just 'user')
  if (error && requiredRoles.length > 0 && !requiredRoles.includes('user')) {
    // Only block if specific roles are required (admin, educator, etc.)
    return (
      <AuthorizationError 
        error={error}
        onRetry={() => {
          queryClient.invalidateQueries({ queryKey: ['user-roles', user?.id] });
        }}
      />
    );
  }
  
  // If error but only 'user' role is required, log warning but allow access
  if (error) {
    console.warn('[ProtectedRoute] Role fetch failed, but granting default user access:', error);
  }
  
  // ✅ SECURITY FIX: Implement role hierarchy
  // Admins, moderators, and educators automatically have 'user' access
  const hasPrivilegedRole = userRoles?.some(role => 
    ['admin', 'moderator', 'educator', 'educator+'].includes(role)
  );

  const hasExactRole = requiredRoles.some(role => userRoles?.includes(role));

  // ✅ FIX: If user is authenticated but has no roles (or roles failed to load), grant default 'user' access
  // This prevents redirect loops when roles haven't been assigned yet or when there's a temporary error
  const hasDefaultUserAccess = user && 
    requiredRoles.includes('user') && 
    (!userRoles || userRoles.length === 0 || error);

  // Grant access if user has either:
  // 1. The exact required role(s), OR
  // 2. A privileged role (which includes 'user' permissions), OR
  // 3. Default 'user' access for authenticated users without roles
  const hasAccess = hasExactRole || (requiredRoles.includes('user') && hasPrivilegedRole) || hasDefaultUserAccess;

  // Debug logging
  console.log('[ProtectedRoute] Role Check:', {
    userRoles,
    requiredRoles,
    hasExactRole,
    hasPrivilegedRole,
    hasDefaultUserAccess,
    hasAccess,
    currentPath: location.pathname
  });
  
  if (!hasAccess) return <Navigate to="/access-denied" replace />;
  
  return <>{children}</>;
};
