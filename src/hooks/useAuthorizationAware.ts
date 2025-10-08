import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AuthorizationAwareReturn {
  canCreateSignals: boolean;
  canEditSignal: (creatorId: string) => boolean;
  canViewAllSignals: boolean;
  isAdmin: boolean;
  isEducator: boolean;
  isModerator: boolean;
  isEducatorPlus: boolean;
  userRoles: string[];
  userPermissions: {
    level: 'basic' | 'educator' | 'admin';
    canModifyAlerts: boolean;
    canAccessRealtime: boolean;
  };
}

/**
 * Authorization-Aware Hook - Pre-compute permissions using secure RPC
 * SECURITY FIX (ERROR #13): Uses get_user_roles() RPC instead of checking profiles table
 * This prevents privilege escalation attacks by validating roles against user_roles table
 */
export function useAuthorizationAware(): AuthorizationAwareReturn {
  const { user, profile } = useAuth();

  // Fetch user roles securely from database using RPC
  const { data: userRoles } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.rpc('get_user_roles', {
        p_user_id: user.id
      });
      if (error) {
        console.error('🔒 [useAuthorizationAware] Failed to fetch roles:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const permissions = useMemo(() => {
    const roles = (userRoles || []).map((r: any) => r.role);
    const isAdmin = roles.includes('admin');
    const isModerator = roles.includes('moderator');
    const isEducator = roles.includes('educator') || roles.includes('educator+');
    const isEducatorPlus = roles.includes('educator+');

    const canCreateSignals = isAdmin || isEducator || isEducatorPlus;
    const canViewAllSignals = true; // All authenticated users can view
    
    const userPermissions = {
      level: (isAdmin ? 'admin' : isEducator ? 'educator' : 'basic') as 'basic' | 'educator' | 'admin',
      canModifyAlerts: canCreateSignals,
      canAccessRealtime: !!user
    };

    const canEditSignal = (creatorId: string) => {
      return isAdmin || user?.id === creatorId;
    };

    return {
      canCreateSignals,
      canEditSignal,
      canViewAllSignals,
      isAdmin,
      isEducator,
      isModerator,
      isEducatorPlus,
      userRoles: roles,
      userPermissions
    };
  }, [userRoles, profile, user]);

  return permissions;
}