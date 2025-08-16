import { useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useSignalPermissions = () => {
  const { profile } = useAuth();

  const isAdmin = useMemo(() => {
    return profile?.access_level === 'admin' || profile?.role === 'admin';
  }, [profile]);

  const isEducator = useMemo(() => {
    return profile?.user_type === 'educator' || 
           profile?.access_level === 'moderator' || 
           profile?.role === 'educator';
  }, [profile]);

  const canCreateSignals = useMemo(() => {
    return isAdmin || isEducator;
  }, [isAdmin, isEducator]);

  const canEditSignal = useCallback((signalCreatorId: string) => {
    return profile?.id === signalCreatorId || isAdmin;
  }, [profile?.id, isAdmin]);

  const validateAction = useCallback((signalCreatorId: string, actionName: string) => {
    const canEdit = canEditSignal(signalCreatorId);
    
    if (!canEdit) {
      console.warn(`[PERMISSION DENIED] User ${profile?.id} cannot ${actionName} signal created by ${signalCreatorId}`);
      return false;
    }
    
    return true;
  }, [canEditSignal, profile?.id]);

  return {
    isAdmin,
    isEducator,
    canCreateSignals,
    canEditSignal,
    validateAction,
    currentUserId: profile?.id
  };
};