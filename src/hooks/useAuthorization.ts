
import { useState, useEffect } from 'react';
import { authorizationService } from '@/services/AuthorizationService';
import { useAuth } from '@/contexts/AuthContext';

export function useAuthorization() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isModeratorOrAdmin, setIsModeratorOrAdmin] = useState<boolean>(false);
  const [isEducatorOrAdmin, setIsEducatorOrAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setIsModeratorOrAdmin(false);
      setIsEducatorOrAdmin(false);
      setLoading(false);
      return;
    }

    const checkAuthorizations = async () => {
      try {
        setLoading(true);
        const [adminResult, moderatorResult, educatorResult] = await Promise.all([
          authorizationService.isAdmin(),
          authorizationService.isModeratorOrAdmin(),
          authorizationService.isEducatorOrAdmin()
        ]);

        setIsAdmin(adminResult);
        setIsModeratorOrAdmin(moderatorResult);
        setIsEducatorOrAdmin(educatorResult);
      } catch (error) {
        console.error('Error checking authorizations:', error);
        setIsAdmin(false);
        setIsModeratorOrAdmin(false);
        setIsEducatorOrAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuthorizations();
  }, [user]);

  return {
    isAdmin,
    isModeratorOrAdmin,
    isEducatorOrAdmin,
    loading,
    refetch: async () => {
      if (user) {
        setLoading(true);
        const [adminResult, moderatorResult, educatorResult] = await Promise.all([
          authorizationService.isAdmin(),
          authorizationService.isModeratorOrAdmin(),
          authorizationService.isEducatorOrAdmin()
        ]);
        setIsAdmin(adminResult);
        setIsModeratorOrAdmin(moderatorResult);
        setIsEducatorOrAdmin(educatorResult);
        setLoading(false);
      }
    }
  };
}
