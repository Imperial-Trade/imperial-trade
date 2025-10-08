import React from 'react';
import { useAuthorizationAware } from '@/hooks/useAuthorizationAware';

interface DashboardUserRoleProps {}

/**
 * ✅ SECURITY FIX (ERROR #15): Secure role display component
 * Uses server-validated roles instead of client-side metadata
 */
export const DashboardUserRole: React.FC<DashboardUserRoleProps> = () => {
  const { isAdmin, isEducator, isEducatorPlus, isModerator } = useAuthorizationAware();

  const getRoleDisplay = () => {
    if (isAdmin) return 'Administrator';
    if (isEducatorPlus) return 'Educator+';  // Must check BEFORE isEducator
    if (isEducator) return 'Educator';
    if (isModerator) return 'Moderator';
    return 'User';
  };

  return (
    <p className="text-xs leading-none text-muted-foreground">
      {getRoleDisplay()}
    </p>
  );
};
