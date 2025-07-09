
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

export type EmailValidationStatus = 
  | 'not_found'        // Email doesn't exist in account_requests
  | 'pending'          // Account request exists but pending
  | 'approved'         // Account request approved
  | 'rejected'         // Account request rejected
  | 'authenticated'    // User has auth account (we'll detect this differently)
  | 'loading'
  | 'idle';

export interface EmailValidationResult {
  status: EmailValidationStatus;
  message: string;
  accountRequest?: any;
}

export const useEmailValidation = () => {
  const [validationResult, setValidationResult] = useState<EmailValidationResult>({
    status: 'idle',
    message: ''
  });
  
  const validateEmail = useCallback(async (email: string): Promise<EmailValidationResult> => {
    if (!email || !email.includes('@')) {
      return {
        status: 'idle',
        message: ''
      };
    }

    setValidationResult({ status: 'loading', message: 'Checking email...' });

    try {
      // Check account request status
      const { data: accountRequest, error } = await supabase
        .from('account_requests')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        console.error('Email validation error:', error);
        const result = {
          status: 'idle' as EmailValidationStatus,
          message: 'Unable to verify email status'
        };
        setValidationResult(result);
        return result;
      }

      let result: EmailValidationResult;

      if (!accountRequest) {
        result = {
          status: 'not_found',
          message: 'Email not found. Please submit an account request first.'
        };
      } else {
        switch (accountRequest.status) {
          case 'pending':
            result = {
              status: 'pending',
              message: 'Your account request is pending approval. Check your request status.',
              accountRequest
            };
            break;
          case 'approved':
            result = {
              status: 'approved',
              message: 'Your account was approved but password setup is incomplete.',
              accountRequest
            };
            break;
          case 'rejected':
            result = {
              status: 'rejected',
              message: 'Your account request was rejected. Check your request status for details.',
              accountRequest
            };
            break;
          default:
            result = {
              status: 'not_found',
              message: 'Email not found. Please submit an account request first.'
            };
        }
      }

      setValidationResult(result);
      return result;
    } catch (error) {
      console.error('Email validation error:', error);
      const result = {
        status: 'idle' as EmailValidationStatus,
        message: 'Unable to verify email status'
      };
      setValidationResult(result);
      return result;
    }
  }, []);

  return {
    validationResult,
    validateEmail,
    clearValidation: () => setValidationResult({ status: 'idle', message: '' })
  };
};
