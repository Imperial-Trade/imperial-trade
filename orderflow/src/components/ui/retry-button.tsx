
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RetryButtonProps {
  onRetry: () => void;
  isRetrying?: boolean;
  disabled?: boolean;
  error?: Error | null;
  attempt?: number;
  maxAttempts?: number;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  showError?: boolean;
}

export function RetryButton({
  onRetry,
  isRetrying = false,
  disabled = false,
  error,
  attempt = 0,
  maxAttempts = 3,
  className,
  variant = 'outline',
  size = 'default',
  showError = true
}: RetryButtonProps) {
  const canRetry = attempt < maxAttempts;

  return (
    <div className="flex flex-col items-center gap-2">
      {showError && error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span>{error.message}</span>
        </div>
      )}
      
      <Button
        variant={variant}
        size={size}
        onClick={onRetry}
        disabled={disabled || isRetrying || !canRetry}
        className={cn('gap-2', className)}
      >
        <RefreshCw className={cn('w-4 h-4', isRetrying && 'animate-spin')} />
        {isRetrying ? 'Retrying...' : canRetry ? 'Try Again' : 'Max Attempts Reached'}
      </Button>
      
      {attempt > 0 && (
        <span className="text-xs text-muted-foreground">
          Attempt {attempt} of {maxAttempts}
        </span>
      )}
    </div>
  );
}
