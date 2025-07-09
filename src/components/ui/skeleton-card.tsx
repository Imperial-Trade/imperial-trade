
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  className?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  lines?: number;
}

export function SkeletonCard({ 
  className, 
  showHeader = true, 
  showFooter = false, 
  lines = 3 
}: SkeletonCardProps) {
  return (
    <Card className={cn('glass-effect border-default', className)}>
      {showHeader && (
        <CardHeader className="space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
      )}
      
      <CardContent className="space-y-3">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton 
            key={i} 
            className={cn(
              'h-4',
              i === lines - 1 ? 'w-2/3' : 'w-full'
            )} 
          />
        ))}
        
        {showFooter && (
          <div className="flex justify-between items-center pt-4">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
