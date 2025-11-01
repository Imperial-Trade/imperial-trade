
import { AccountRequestData } from '@/api/entities/AccountRequest';

export interface ValidationError {
  field: string;
  message: string;
}

export interface AccountRequestValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  hasChanges?: boolean;
}

export const validateAccountRequestData = (
  data: Partial<AccountRequestData>,
  existingRequest?: AccountRequestData | null
): AccountRequestValidationResult => {
  const errors: ValidationError[] = [];

  // Basic field validation
  if (!data.full_name?.trim()) {
    errors.push({ field: 'full_name', message: 'Full name is required' });
  }

  if (!data.email?.trim()) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' });
  }

  if (!data.vt_market_account_number?.trim()) {
    errors.push({ field: 'vt_market_account_number', message: 'VT Market account number is required' });
  }

  if (!data.account_type || !['user', 'educator'].includes(data.account_type)) {
    errors.push({ field: 'account_type', message: 'Please select a valid account type' });
  }

  // Educator-specific validation
  if (data.account_type === 'educator' && !data.reason?.trim()) {
    errors.push({ field: 'reason', message: 'Please explain why you need an educator account' });
  }

  // Reason length validation
  if (data.reason && (data.reason.length < 10 || data.reason.length > 500)) {
    errors.push({ field: 'reason', message: 'Reason must be between 10 and 500 characters' });
  }

  // Check for meaningful changes if updating existing request
  let hasChanges = true;
  if (existingRequest) {
    hasChanges = 
      data.full_name !== existingRequest.full_name ||
      data.phone_number !== (existingRequest.phone_number || '') ||
      data.vt_market_account_number !== (existingRequest.vt_market_account_number || '') ||
      data.referrer !== (existingRequest.referrer || '') ||
      data.account_type !== existingRequest.account_type ||
      data.reason !== (existingRequest.reason || '');

    if (!hasChanges) {
      errors.push({ field: 'general', message: 'Please make at least one meaningful change before resubmitting' });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    hasChanges
  };
};

export const getFieldError = (errors: ValidationError[], field: string): string | undefined => {
  return errors.find(error => error.field === field)?.message;
};

export const getGeneralError = (errors: ValidationError[]): string | undefined => {
  return errors.find(error => error.field === 'general')?.message;
};
