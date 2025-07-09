
import React from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EnhancedLoadingProps {
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  timeout?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'skeleton' | 'dots';
  message?: string;
  retryButton?: boolean;
}

export function EnhancedLoading({
  isLoading = false,
  error,
  onRetry,
  timeout = false,
  className,
  size = 'md',
  variant = 'spinner',
  message,
  retryButton = true
}: EnhancedLoadingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  // Error state
  if (error || timeout) {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-4 p-6', className)}>
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className={sizeClasses[size]} />
          <span className={textSizeClasses[size]}>
            {timeout ? 'Request timed out' : error?.message || 'Something went wrong'}
          </span>
        </div>
        {onRetry && retryButton && (
          <Button variant="outline" onClick={onRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
        )}
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-3 p-6', className)}>
        {variant === 'spinner' && (
          <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
        )}
        
        {variant === 'dots' && (
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  'bg-primary rounded-full animate-pulse',
                  size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4'
                )}
                style={{
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: '1s'
                }}
              />
            ))}
          </div>
        )}
        
        {variant === 'skeleton' && (
          <div className="space-y-2 w-full max-w-sm">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
          </div>
        )}
        
        {message && (
          <span className={cn('text-muted-foreground', textSizeClasses[size])}>
            {message}
          </span>
        )}
      </div>
    );
  }

  return null;
}
