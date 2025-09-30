import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Database, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CachedDataIndicatorProps {
  isCached: boolean;
  cacheAge?: Date;
  className?: string;
  variant?: 'badge' | 'banner';
}

export function CachedDataIndicator({ 
  isCached, 
  cacheAge,
  className,
  variant = 'badge'
}: CachedDataIndicatorProps) {
  if (!isCached) return null;

  const getAgeText = () => {
    if (!cacheAge) return '';
    
    const ageSeconds = Math.floor((Date.now() - cacheAge.getTime()) / 1000);
    
    if (ageSeconds < 60) return `${ageSeconds}s ago`;
    if (ageSeconds < 3600) return `${Math.floor(ageSeconds / 60)}m ago`;
    return `${Math.floor(ageSeconds / 3600)}h ago`;
  };

  if (variant === 'banner') {
    return (
      <div className={cn(
        'flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20',
        className
      )}>
        <Database className="w-4 h-4 text-amber-500" />
        <span className="text-sm text-amber-500 font-medium">
          Showing cached data
        </span>
        {cacheAge && (
          <span className="text-xs text-amber-500/70">
            (cached {getAgeText()})
          </span>
        )}
      </div>
    );
  }

  return (
    <Badge variant="secondary" className={cn('gap-1.5 bg-amber-500/10 text-amber-500', className)}>
      <Database className="w-3 h-3" />
      <span>Cached</span>
      {cacheAge && (
        <>
          <Clock className="w-3 h-3" />
          <span className="text-xs">{getAgeText()}</span>
        </>
      )}
    </Badge>
  );
}
