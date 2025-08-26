import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AuthorizationAwareReturn {
  canCreateSignals: boolean;
  canEditSignal: (creatorId: string) => boolean;
  canViewAllSignals: boolean;
  isAdmin: boolean;
  isEducator: boolean;
  userPermissions: {
    level: 'basic' | 'educator' | 'admin';
    canModifyAlerts: boolean;
    canAccessRealtime: boolean;
  };
}

/**
 * Authorization-Aware Hook - Pre-compute permissions to prevent repeated checks
 * Reduces authorization calculation overhead in components
 */
export function useAuthorizationAware(): AuthorizationAwareReturn {
  const { user, profile } = useAuth();

  const permissions = useMemo(() => {
    const isAdmin = profile?.access_level === 'admin' || profile?.role === 'admin';
    const isEducator = profile?.user_type === 'educator' || 
                       profile?.access_level === 'moderator' || 
                       profile?.role === 'educator';

    const canCreateSignals = isAdmin || isEducator;
    const canViewAllSignals = true; // All authenticated users can view
    
    const userPermissions = {
      level: (isAdmin ? 'admin' : isEducator ? 'educator' : 'basic') as 'basic' | 'educator' | 'admin',
      canModifyAlerts: canCreateSignals,
      canAccessRealtime: !!user
    };

    const canEditSignal = (creatorId: string) => {
      return isAdmin || profile?.id === creatorId;
    };

    return {
      canCreateSignals,
      canEditSignal,
      canViewAllSignals,
      isAdmin,
      isEducator,
      userPermissions
    };
  }, [profile, user]);

  return permissions;
}