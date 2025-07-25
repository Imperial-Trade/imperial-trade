
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
      
      // Use direct Supabase API call to check user existence
      // Reset password probe - if user exists, this will succeed without sending email
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.toLowerCase().trim(),
        { redirectTo: null }
      );

      if (error) {
        console.log('Reset password probe error:', error.message);
        
        // Check if this is a "user not found" error
        const userNotFound = error.message.includes('User not found') || 
                           error.message.includes('Invalid login credentials') ||
                           error.message.includes('User does not exist');
        
        if (userNotFound) {
          console.log('User does not exist based on reset password probe');
          return false;
        }
        
        // For approved account requests, default to "user doesn't exist" on API failure
        if (options.accountRequest?.status === 'approved') {
          console.log('API call failed but account is approved - defaulting to user does not exist');
          return false;
        }
        
        // For other cases, this is a genuine error
        console.error('Genuine error checking user existence:', error);
        setError('Unable to check user status. Please try again.');
        return false;
      }

      // If no error, user exists
      console.log('User exists - reset password probe succeeded');
      return true;
      
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
