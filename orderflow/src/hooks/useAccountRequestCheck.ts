
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AccountRequestData } from '@/api/entities/AccountRequest';

interface UseAccountRequestCheckReturn {
  existingRequest: AccountRequestData | null;
  isChecking: boolean;
  error: string | null;
  checkForExistingRequest: (email: string) => Promise<AccountRequestData | null>;
  clearCheck: () => void;
}

export const useAccountRequestCheck = (): UseAccountRequestCheckReturn => {
  const [existingRequest, setExistingRequest] = useState<AccountRequestData | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkForExistingRequest = useCallback(async (email: string): Promise<AccountRequestData | null> => {
    if (!email.trim()) return null;

    setIsChecking(true);
    setError(null);

    try {
      const normalizedEmail = email.toLowerCase().trim();
      console.log('🔍 Checking for existing account request via edge function:', normalizedEmail);

      // Use edge function to bypass RLS for unauthenticated users
      const { data: response, error: invokeError } = await supabase.functions.invoke('account-status-check', {
        body: { email: normalizedEmail }
      });

      if (invokeError) {
        console.error('❌ Edge function error:', invokeError);
        const errorMessage = 'Unable to check account request. Please try again.';
        setError(errorMessage);
        setExistingRequest(null);
        return null;
      }

      if (response.status === 'found' && response.data) {
        console.log('✅ Account request found:', response.data);
        const request = response.data as AccountRequestData;
        setExistingRequest(request);
        return request;
      } else if (response.status === 'not_found') {
        console.log('ℹ️ No account request found for:', normalizedEmail);
        setExistingRequest(null);
        return null;
      } else {
        console.error('❌ Unexpected response:', response);
        const errorMessage = response.error || 'Failed to check existing request';
        setError(errorMessage);
        setExistingRequest(null);
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check existing request';
      setError(errorMessage);
      console.error('❌ Error checking for existing request:', err);
      setExistingRequest(null);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const clearCheck = useCallback(() => {
    setExistingRequest(null);
    setError(null);
  }, []);

  return {
    existingRequest,
    isChecking,
    error,
    checkForExistingRequest,
    clearCheck,
  };
};
