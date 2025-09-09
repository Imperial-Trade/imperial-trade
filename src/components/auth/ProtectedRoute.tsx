
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/layout/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredAccessLevel?: string;
  requiredUserType?: string | string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredAccessLevel,
  requiredUserType 
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div data-current-component="ProtectedRoute-Loading">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    // Save the attempted location for redirecting after login
    return <Navigate to="/signin" state={{ from: location.pathname + location.search }} replace />;
  }

  // Check access level (admin, moderator, user)
  if (requiredAccessLevel) {
    const userAccessLevel = user.user_metadata?.access_level || 'user';
    if (userAccessLevel !== requiredAccessLevel) {
      return <Navigate to="/access-denied" replace />;
    }
  }

  // Check user type (educator, ib_partner, etc.)
  if (requiredUserType) {
    const userType = user.user_metadata?.user_type || 'member';
    const allowedTypes = Array.isArray(requiredUserType) ? requiredUserType : [requiredUserType];
    
    if (!allowedTypes.includes(userType)) {
      return <Navigate to="/access-denied" replace />;
    }
  }

  return (
    <div data-current-component="ProtectedRoute-Content">
      {children}
    </div>
  );
};
