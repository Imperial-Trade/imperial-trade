
// Email validation hook - simplified and optimized
// Removed complex validation logic that was causing performance issues

import { useState, useCallback } from 'react';

interface ValidationResult {
  status: 'idle' | 'valid' | 'invalid' | 'checking';
  message: string;
}

export const useEmailValidation = () => {
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    status: 'idle',
    message: ''
  });

  const validateEmail = useCallback(async (email: string): Promise<ValidationResult> => {
    if (!email) {
      const result: ValidationResult = { status: 'idle', message: '' };
      setValidationResult(result);
      return result;
    }

    // Simple email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);

    const result: ValidationResult = {
      status: isValid ? 'valid' : 'invalid',
      message: isValid ? '' : 'Please enter a valid email address'
    };

    setValidationResult(result);
    return result;
  }, []);

  const clearValidation = useCallback(() => {
    setValidationResult({ status: 'idle', message: '' });
  }, []);

  return {
    validationResult,
    validateEmail,
    clearValidation
  };
};
