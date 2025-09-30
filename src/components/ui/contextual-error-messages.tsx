import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  WifiOff, 
  ServerCrash, 
  Clock, 
  Database,
  RefreshCw,
  AlertTriangle 
} from 'lucide-react';

export type ErrorContext = 
  | 'no-internet'
  | 'server-unavailable'
  | 'stale-data'
  | 'cache-full'
  | 'rate-limited'
  | 'generic';

interface ContextualErrorMessageProps {
  context: ErrorContext;
  onRetry?: () => void;
  onDismiss?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ContextualErrorMessage({
  context,
  onRetry,
  onDismiss,
  retryLabel = 'Try Again',
  className
}: ContextualErrorMessageProps) {
  const getErrorConfig = () => {
    switch (context) {
      case 'no-internet':
        return {
          icon: WifiOff,
          title: 'No Internet Connection',
          description: 'You are offline. Showing cached data. Reconnecting automatically...',
          variant: 'destructive' as const,
          showRetry: true
        };
      
      case 'server-unavailable':
        return {
          icon: ServerCrash,
          title: 'Server Temporarily Unavailable',
          description: 'We are experiencing technical difficulties. Reconnecting in 30 seconds...',
          variant: 'destructive' as const,
          showRetry: true
        };
      
      case 'stale-data':
        return {
          icon: Clock,
          title: 'Data May Be Outdated',
          description: 'Unable to fetch latest data. Information shown may not be current.',
          variant: 'default' as const,
          showRetry: true
        };
      
      case 'cache-full':
        return {
          icon: Database,
          title: 'Storage Full',
          description: 'Unable to cache data. Some features may be limited.',
          variant: 'default' as const,
          showRetry: false
        };
      
      case 'rate-limited':
        return {
          icon: AlertTriangle,
          title: 'Too Many Requests',
          description: 'Please wait a moment before trying again.',
          variant: 'default' as const,
          showRetry: false
        };
      
      default:
        return {
          icon: AlertTriangle,
          title: 'Something Went Wrong',
          description: 'An unexpected error occurred. Please try again.',
          variant: 'destructive' as const,
          showRetry: true
        };
    }
  };

  const config = getErrorConfig();
  const Icon = config.icon;

  return (
    <Alert variant={config.variant} className={className}>
      <Icon className="h-4 w-4" />
      <AlertTitle>{config.title}</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>{config.description}</span>
        <div className="flex gap-2">
          {config.showRetry && onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="gap-2"
            >
              <RefreshCw className="w-3 h-3" />
              {retryLabel}
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
