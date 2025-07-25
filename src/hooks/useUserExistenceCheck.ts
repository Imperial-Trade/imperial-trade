
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseUserExistenceCheckReturn {
  checkUserExists: (email: string) => Promise<boolean>;
  isChecking: boolean;
  error: string | null;
  clearError: () => void;
}

interface UseUserExistenceCheckOptions {
  accountRequest?: any;
}

export const useUserExistenceCheck = (options: UseUserExistenceCheckOptions = {}): UseUserExistenceCheckReturn => {
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const checkUserExists = useCallback(async (email: string): Promise<boolean> => {
    setIsChecking(true);
    setError(null);

    try {
      console.log('Checking if user exists for email:', email, 'Account request status:', options.accountRequest?.status);
      
      // Use the deployed edge function to check user existence
      const { data, error } = await supabase.functions.invoke('check-user-existence', {
        body: { email: email.toLowerCase().trim() }
      });

      if (error) {
        console.error('Error calling edge function:', error);
        
        // For approved account requests, default to "user doesn't exist" on edge function failure
        if (options.accountRequest?.status === 'approved') {
          console.log('Edge function failed but account is approved - defaulting to user does not exist');
          return false;
        }
        
        // For other cases, this is a genuine error
        setError('Unable to check user status. Please try again.');
        return false;
      }

      const userExists = data?.userExists || false;
      console.log('User existence check result:', { email, userExists });
      return userExists;
      
    } catch (error) {
      console.error('Network error checking user existence:', error);
      
      // For approved account requests, default to "user doesn't exist" on network failure
      if (options.accountRequest?.status === 'approved') {
        console.log('Network error but account is approved - defaulting to user does not exist');
        return false;
      }
      
      setError('Unable to check user status. Please try again.');
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [options.accountRequest]);

  return {
    checkUserExists,
    isChecking,
    error,
    clearError,
  };
};
