import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorizationAware } from '@/hooks/useAuthorizationAware';
import LoadingSpinner from '@/components/layout/LoadingSpinner';

interface AdminRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'moderator' | 'educator' | 'educator+' | 'user')[];
}

/**
 * ✅ SECURITY: Secure admin route protection using server-validated roles
 * Uses RPC-based validation to prevent privilege escalation attacks
 */
export const AdminRoute: React.FC<AdminRouteProps> = ({ 
  children, 
  allowedRoles = ['admin'] 
}) => {
  const { user, loading } = useAuth();
  const { userRoles } = useAuthorizationAware();
  
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/signin" replace />;
  
  const hasAccess = allowedRoles.some(role => userRoles?.includes(role));
  
  if (!hasAccess) return <Navigate to="/access-denied" replace />;
  
  return <>{children}</>;
};
