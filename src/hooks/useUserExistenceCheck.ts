
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
      
      // Use admin API to check if user exists
      const { data, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('Error checking user existence:', authError);
        // Fallback: try to sign in with a dummy password to check if user exists
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: 'dummy-password-for-checking'
        });
        
        // If error contains "Invalid login credentials", user exists but password is wrong
        // If error contains "User not found" or similar, user doesn't exist
        if (signInError?.message?.includes('Invalid login credentials')) {
          return true;
        }
        
        // For other errors or if user not found, assume user doesn't exist
        return false;
      }

      // Check if user with this email exists in the auth users list
      const userExists = data?.users?.some((user: any) => {
        // Properly handle the user type and email property with type assertion
        return user?.email && typeof user.email === 'string' && 
               user.email.toLowerCase().trim() === email.toLowerCase().trim();
      }) || false;
      
      console.log('User existence check result:', userExists);
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
