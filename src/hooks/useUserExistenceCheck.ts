
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
      console.log('=== STARTING USER EXISTENCE CHECK ===');
      console.log('Email:', email);
      console.log('Account request status:', options.accountRequest?.status);
      console.log('Supabase client ready:', !!supabase);
      console.log('Functions available:', !!supabase.functions);
      
      console.log('Calling edge function check-user-existence...');
      const startTime = Date.now();
      
      const { data, error } = await supabase.functions.invoke('check-user-existence', {
        body: { email: email.toLowerCase().trim() }
      });
      
      const endTime = Date.now();
      console.log('Edge function call completed in:', endTime - startTime, 'ms');
      console.log('Raw response data:', data);
      console.log('Raw response error:', error);

      if (error) {
        console.error('=== EDGE FUNCTION ERROR ===');
        console.error('Error object:', error);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        console.error('Error code:', error.code);
        
        // NO FALLBACK - Surface the real error
        setError(`Edge function failed: ${error.message || 'Unknown error'}`);
        return false;
      }

      console.log('=== EDGE FUNCTION SUCCESS ===');
      console.log('Data received:', data);
      console.log('User exists value:', data?.userExists);
      
      const userExists = data?.userExists || false;
      console.log('Final result - User exists:', userExists);
      console.log('=== USER EXISTENCE CHECK COMPLETE ===');
      
      return userExists;
      
    } catch (error) {
      console.error('=== NETWORK/UNEXPECTED ERROR ===');
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // NO FALLBACK - Surface the real error
      setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
