
import React from 'react';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { FieldError } from 'react-hook-form';

interface ValidationFeedbackProps {
  error?: FieldError;
  isValid?: boolean;
  isValidating?: boolean;
  value?: string;
}

export const ValidationFeedback: React.FC<ValidationFeedbackProps> = ({
  error,
  isValid,
  isValidating,
  value
}) => {
  if (isValidating) {
    return (
      <div className="flex items-center gap-2 text-sm text-blue-500">
        <div className="animate-spin rounded-full h-3 w-3 border border-blue-500 border-t-transparent" />
        <span>Validating...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-500">
        <XCircle className="w-4 h-4" />
        <span>{error.message}</span>
      </div>
    );
  }

  if (isValid && value && value.length > 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-500">
        <CheckCircle className="w-4 h-4" />
        <span>Valid</span>
      </div>
    );
  }

  return null;
};
