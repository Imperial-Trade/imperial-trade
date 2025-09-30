import React from 'react';
import { cn } from '@/lib/utils';

interface LivePulseIndicatorProps {
  isLive: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

export function LivePulseIndicator({ 
  isLive, 
  size = 'md',
  className,
  showLabel = false 
}: LivePulseIndicatorProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  if (!isLive) return null;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative flex items-center justify-center">
        <span className={cn(
          'absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping',
          sizeClasses[size]
        )} />
        <span className={cn(
          'relative inline-flex rounded-full bg-emerald-500',
          sizeClasses[size]
        )} />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-emerald-500">
          LIVE
        </span>
      )}
    </div>
  );
}
