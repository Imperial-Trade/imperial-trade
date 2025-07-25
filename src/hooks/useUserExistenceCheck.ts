
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseUserExistenceCheckReturn {
  checkUserExists: (email: string) => Promise<boolean>;
  isChecking: boolean;
  error: string | null;
  clearError: () => void;
}

export const useUserExistenceCheck = (): UseUserExistenceCheckReturn => {
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const checkUserExists = useCallback(async (email: string): Promise<boolean> => {
    setIsChecking(true);
    setError(null);

    try {
      console.log('Checking if user exists for email:', email);
      
      // Use the dedicated backend endpoint to check user existence
      const { data, error } = await supabase.functions.invoke('check-user-existence', {
        body: { email: email.toLowerCase().trim() }
      });

      if (error) {
        console.error('Error checking user existence:', error);
        setError('Unable to check user status. Please try again.');
        return false;
      }

      const userExists = data?.userExists || false;
      console.log('User existence check result:', { email, userExists });
      return userExists;
      
    } catch (error) {
      console.error('Network error checking user existence:', error);
      setError('Unable to check user status. Please try again.');
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  return {
    checkUserExists,
    isChecking,
    error,
    clearError,
  };
};
