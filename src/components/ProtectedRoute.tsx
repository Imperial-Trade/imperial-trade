
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorization } from '@/hooks/useAuthorization';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireModerator?: boolean;
  requireEducator?: boolean;
  fallbackPath?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
  requireModerator = false,
  requireEducator = false,
  fallbackPath = '/dashboard'
}) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isModeratorOrAdmin, isEducatorOrAdmin, loading: authzLoading } = useAuthorization();

  // Show loading while checking authentication and authorization
  if (authLoading || authzLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Redirect to signin if not authenticated
  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // Check admin requirement
  if (requireAdmin && !isAdmin) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Check moderator requirement (moderator or admin)
  if (requireModerator && !isModeratorOrAdmin) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Check educator requirement (educator, moderator, or admin)
  if (requireEducator && !isEducatorOrAdmin) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};
