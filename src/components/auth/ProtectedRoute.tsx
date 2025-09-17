
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

  // Check for password reset flow - bypass all authentication checks if detected
  const isPasswordResetFlow = React.useMemo(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);
    
    // Check for recovery type in hash or search params
    const hashType = hashParams.get('type');
    const searchType = searchParams.get('type');
    
    // Check for various token formats
    const hasAccessToken = hashParams.has('access_token') || searchParams.has('access_token');
    const hasRefreshToken = hashParams.has('refresh_token') || searchParams.has('refresh_token');
    const hasTokenHash = hashParams.has('token_hash') || searchParams.has('token_hash');
    
    return hashType === 'recovery' || searchType === 'recovery' || hasAccessToken || hasRefreshToken || hasTokenHash;
  }, []);

  // If password reset flow detected, render children WITHOUT authentication checks
  if (isPasswordResetFlow) {
    console.log('🔐 ProtectedRoute: Password reset flow detected, bypassing authentication checks');
    return (
      <div data-current-component="ProtectedRoute-PasswordReset">
        {children}
      </div>
    );
  }

  if (loading) {
    console.log('🔄 ProtectedRoute: Loading authentication state...');
    return (
      <div data-current-component="ProtectedRoute-Loading">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    console.log('🚫 ProtectedRoute: No user found, redirecting to signin');
    console.log('📍 ProtectedRoute: Current location:', location.pathname + location.search);
    // Save the attempted location for redirecting after login
    return <Navigate to="/signin" state={{ from: location.pathname + location.search }} replace />;
  }

  // Check access level (admin, moderator, user)
  if (requiredAccessLevel) {
    const userAccessLevel = user.user_metadata?.access_level || 'user';
    console.log('🔐 ProtectedRoute: Checking access level:', { required: requiredAccessLevel, user: userAccessLevel });
    if (userAccessLevel !== requiredAccessLevel) {
      console.log('🚫 ProtectedRoute: Access denied - insufficient access level');
      return <Navigate to="/access-denied" replace />;
    }
  }

  // Check user type (educator, ib_partner, etc.)
  if (requiredUserType) {
    const userType = user.user_metadata?.user_type || 'member';
    const allowedTypes = Array.isArray(requiredUserType) ? requiredUserType : [requiredUserType];
    console.log('🔐 ProtectedRoute: Checking user type:', { required: allowedTypes, user: userType });
    
    if (!allowedTypes.includes(userType)) {
      console.log('🚫 ProtectedRoute: Access denied - insufficient user type');
      return <Navigate to="/access-denied" replace />;
    }
  }

  console.log('✅ ProtectedRoute: Authentication and authorization checks passed');

  return (
    <div data-current-component="ProtectedRoute-Content">
      {children}
    </div>
  );
};
