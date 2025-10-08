import React from 'react';
import { useAuthorizationAware } from '@/hooks/useAuthorizationAware';

interface DashboardUserRoleProps {
  userId?: string;
}

/**
 * ✅ SECURITY FIX (ERROR #15): Secure role display component
 * Uses server-validated roles instead of client-side metadata
 */
export const DashboardUserRole: React.FC<DashboardUserRoleProps> = ({ userId }) => {
  const { isAdmin, isEducator } = useAuthorizationAware();

  const getRoleDisplay = () => {
    if (isAdmin) return 'Administrator';
    if (isEducator) return 'Educator';
    return 'Member';
  };

  return (
    <p className="text-xs leading-none text-muted-foreground">
      {getRoleDisplay()}
    </p>
  );
};
