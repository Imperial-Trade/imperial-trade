
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AccountStatusData {
  id: string;
  email: string;
  status: string;
  full_name: string;
  account_type: string;
  created_at: string;
  rejection_reason?: string;
}

interface StatusError {
  type: 'not_found' | 'network_error' | 'system_error';
  message: string;
}

interface UseAccountStatusProps {
  email?: string;
}

// Simple cache to prevent duplicate requests
const statusCache = new Map<string, { data: AccountStatusData | null; timestamp: number; error?: StatusError }>();
const CACHE_DURATION = 30 * 1000; // 30 seconds

export const useAccountStatus = ({ email }: UseAccountStatusProps = {}) => {
  const [status, setStatus] = useState<AccountStatusData | null>(null);
  const [error, setError] = useState<StatusError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const lastCheckedEmailRef = useRef<string>('');
  const isCheckingRef = useRef(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const checkStatus = useCallback(async (emailToCheck: string) => {
    // Prevent duplicate requests
    if (isCheckingRef.current && lastCheckedEmailRef.current === emailToCheck) {
      console.log('Skipping duplicate request for:', emailToCheck);
      return;
    }

    const normalizedEmail = emailToCheck.toLowerCase().trim();
    
    // Check cache first
    const cached = statusCache.get(normalizedEmail);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Using cached result for:', normalizedEmail);
      if (cached.error) {
        setError(cached.error);
        setStatus(null);
      } else {
        setStatus(cached.data);
        setError(null);
      }
      return;
    }

    try {
      isCheckingRef.current = true;
      lastCheckedEmailRef.current = normalizedEmail;
      setIsLoading(true);
      setError(null);
      
      console.log('Checking account status for:', normalizedEmail);
      console.log('🚀 Invoking edge function: account-status-check');
      console.log('📧 Payload:', { email: normalizedEmail });
      console.log('⏰ Timeout: 30 seconds');

      const startTime = Date.now();

      // Create timeout promise (30 seconds for slow networks)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => {
          console.error('⏰ REQUEST TIMEOUT: Edge function did not respond within 30 seconds');
          reject(new Error('Request timeout after 30 seconds'));
        }, 30000)
      );

      // Race between function call and timeout
      const result = await Promise.race([
        supabase.functions.invoke('account-status-check', {
          body: { email: normalizedEmail }
        }).then(res => {
          const responseTime = Date.now() - startTime;
          console.log(`✅ Edge function responded successfully in ${responseTime}ms`);
          console.log('📦 Response data:', res);
          return res;
        }).catch(err => {
          console.error('❌ Edge function invocation failed:', err);
          console.error('❌ Error type:', err.constructor.name);
          console.error('❌ Error message:', err.message);
          console.error('❌ Error details:', err);
          throw err;
        }),
        timeoutPromise
      ]).catch(error => {
        if (error.message.includes('timeout')) {
          console.warn('⏰ Timeout triggered - falling back to direct database query');
          return { 
            data: null, 
            error: { 
              message: 'Edge function timed out. Using direct database fallback.',
              name: 'TimeoutError'
            } 
          };
        }
        console.error('❌ Unhandled error during edge function call:', error);
        throw error;
      });

      const { data: response, error: invokeError } = result as any;

      if (invokeError) {
        console.error('Edge function error:', invokeError);
        
        // Fallback: Try direct database query if edge function fails
        console.log('⚠️ Edge function failed, attempting direct database query...');

        try {
          const { data: directData, error: directError } = await supabase
            .from('account_requests')
            .select('*')
            .ilike('email', normalizedEmail)
            .order('created_at', { ascending: false })
            .maybeSingle();

          if (!directError && directData) {
            console.log('✅ Direct database query successful:', directData);
            setStatus(directData as AccountStatusData);
            setError(null);
            
            statusCache.set(normalizedEmail, {
              data: directData as AccountStatusData,
              timestamp: Date.now()
            });
            return;
          } else if (directError) {
            console.error('❌ Direct database query also failed:', directError);
          }
        } catch (fallbackError) {
          console.error('❌ Fallback query error:', fallbackError);
        }

        // If we reach here, both edge function and direct query failed
        const errorObj = {
          type: 'system_error' as const,
          message: 'Unable to check account status. Please try again or contact support.'
        };
        setError(errorObj);
        setStatus(null);
        
        statusCache.set(normalizedEmail, {
          data: null,
          timestamp: Date.now(),
          error: errorObj
        });
        return;
      }

      if (response.status === 'not_found') {
        const errorObj = {
          type: 'not_found' as const,
          message: response.message || 'No account request found for this email address.'
        };
        setError(errorObj);
        setStatus(null);
        
        // Cache the not found result
        statusCache.set(normalizedEmail, {
          data: null,
          timestamp: Date.now(),
          error: errorObj
        });
      } else if (response.status === 'error') {
        const errorObj = {
          type: 'system_error' as const,
          message: response.error || 'Unable to check account status. Please try again.'
        };
        setError(errorObj);
        setStatus(null);
        
        // Cache the error
        statusCache.set(normalizedEmail, {
          data: null,
          timestamp: Date.now(),
          error: errorObj
        });
      } else if (response.status === 'found' && response.data) {
        setStatus(response.data as AccountStatusData);
        setError(null);
        
        // Cache the successful result
        statusCache.set(normalizedEmail, {
          data: response.data as AccountStatusData,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Network error:', error);
      const errorObj = {
        type: 'network_error' as const,
        message: 'Connection failed. Please check your internet connection and try again.'
      };
      setError(errorObj);
      setStatus(null);
      
      // Cache the network error
      statusCache.set(normalizedEmail, {
        data: null,
        timestamp: Date.now(),
        error: errorObj
      });
    } finally {
      setIsLoading(false);
      // Clear the checking flag after a short delay
      setTimeout(() => {
        isCheckingRef.current = false;
      }, 1000);
    }
  }, []);

  const retryCheck = useCallback(() => {
    if (lastCheckedEmailRef.current) {
      // Clear cache for this email to force a fresh request
      statusCache.delete(lastCheckedEmailRef.current);
      checkStatus(lastCheckedEmailRef.current);
    }
  }, [checkStatus]);

  const resetState = useCallback(() => {
    console.log('Resetting account status state');
    setStatus(null);
    setError(null);
    setIsLoading(false);
    lastCheckedEmailRef.current = '';
    isCheckingRef.current = false;
  }, []);

  return {
    status,
    error,
    isLoading,
    checkStatus,
    retryCheck,
    clearError,
    resetState,
  };
};
