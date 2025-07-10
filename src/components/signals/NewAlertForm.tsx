
// Legacy form component - fully deprecated and replaced by OptimizedNewAlertForm
// This component now redirects to the optimized version to prevent accidental usage

import React from 'react';
import OptimizedNewAlertForm from './OptimizedNewAlertForm';
import { logLegacyUsage } from '@/utils/legacyCleanup';

interface NewAlertFormProps {
  onSubmit: (data: any) => void;
  onCancel?: () => void;
}

export default function NewAlertForm({ onSubmit, onCancel }: NewAlertFormProps) {
  // Log legacy usage for monitoring
  React.useEffect(() => {
    logLegacyUsage('NewAlertForm');
  }, []);

  // Redirect to optimized component
  return (
    <OptimizedNewAlertForm 
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
}
