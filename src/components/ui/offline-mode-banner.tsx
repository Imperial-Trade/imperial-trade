import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff, Database, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OfflineModeBannerProps {
  isOffline: boolean;
  showCachedData?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function OfflineModeBanner({
  isOffline,
  showCachedData = true,
  onRetry,
  onDismiss,
  className
}: OfflineModeBannerProps) {
  if (!isOffline) return null;

  return (
    <Alert 
      variant="destructive" 
      className={cn('border-destructive/50 bg-destructive/10', className)}
    >
      <WifiOff className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-medium">You are offline</span>
          {showCachedData && (
            <>
              <span className="text-muted-foreground">—</span>
              <div className="flex items-center gap-1.5 text-sm">
                <Database className="w-3 h-3" />
                <span>Showing cached data</span>
              </div>
            </>
          )}
        </div>
        
        <div className="flex gap-2">
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="gap-2"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </Button>
          )}
          {onDismiss && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
            >
              Dismiss
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
