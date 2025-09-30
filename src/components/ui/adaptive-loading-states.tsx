import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type LoadingStrategy = 'full' | 'minimal' | 'skeleton' | 'spinner';

interface AdaptiveLoadingStatesProps {
  strategy: LoadingStrategy;
  message?: string;
  className?: string;
  count?: number;
}

export function AdaptiveLoadingStates({
  strategy,
  message = 'Loading...',
  className,
  count = 3
}: AdaptiveLoadingStatesProps) {
  switch (strategy) {
    case 'full':
      return (
        <div className={cn('space-y-4 p-4', className)}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      );

    case 'minimal':
      return (
        <div className={cn('space-y-2 p-4', className)}>
          {Array.from({ length: count }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      );

    case 'skeleton':
      return (
        <div className={cn('space-y-4 p-4', className)}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      );

    case 'spinner':
      return (
        <div className={cn('flex flex-col items-center justify-center gap-3 p-8', className)}>
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      );
  }
}

// Hook to determine optimal loading strategy based on connection quality
export function useAdaptiveLoadingStrategy(connectionQuality: 'excellent' | 'good' | 'poor' | 'offline'): LoadingStrategy {
  switch (connectionQuality) {
    case 'excellent':
    case 'good':
      return 'full';
    case 'poor':
      return 'minimal';
    case 'offline':
      return 'spinner';
    default:
      return 'skeleton';
  }
}
