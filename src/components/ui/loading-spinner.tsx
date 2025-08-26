
import React from 'react';
import { cn } from '@/lib/utils';

type SpinnerSize = 'sm' | 'md' | 'lg';

export const LoadingSpinner: React.FC<{ size?: SpinnerSize; className?: string }> = ({ size = 'md', className }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }[size];

  return (
    <div
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-border border-t-primary',
        sizeClasses,
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
};
