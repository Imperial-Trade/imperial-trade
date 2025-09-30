import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface EnhancedErrorDisplayProps {
  error: Error;
  errorInfo?: React.ErrorInfo;
  onReset?: () => void;
  onRetry?: () => void;
  showDetails?: boolean;
}

export function EnhancedErrorDisplay({
  error,
  errorInfo,
  onReset,
  onRetry,
  showDetails = false
}: EnhancedErrorDisplayProps) {
  const getErrorMessage = () => {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return {
        title: 'Connection Error',
        description: 'Unable to reach the server. Please check your internet connection.',
        action: 'Retry Connection'
      };
    }
    
    if (message.includes('timeout')) {
      return {
        title: 'Request Timeout',
        description: 'The request took too long to complete. The server might be overloaded.',
        action: 'Try Again'
      };
    }
    
    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return {
        title: 'Access Denied',
        description: 'You do not have permission to access this resource.',
        action: 'Go to Dashboard'
      };
    }
    
    return {
      title: 'Something Went Wrong',
      description: error.message || 'An unexpected error occurred.',
      action: 'Reload'
    };
  };

  const errorConfig = getErrorMessage();

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-destructive/10">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle className="text-xl">{errorConfig.title}</CardTitle>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {errorConfig.description}
          </p>
          
          {showDetails && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-2">
                <Bug className="w-4 h-4" />
                Technical Details
              </summary>
              <div className="mt-2 p-3 bg-muted rounded-md">
                <p className="font-mono text-xs break-all">{error.message}</p>
                {errorInfo && (
                  <pre className="mt-2 text-xs overflow-auto max-h-32">
                    {errorInfo.componentStack}
                  </pre>
                )}
              </div>
            </details>
          )}
        </CardContent>
        
        <CardFooter className="flex gap-2">
          {onRetry && (
            <Button
              variant="default"
              onClick={onRetry}
              className="flex-1 gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {errorConfig.action}
            </Button>
          )}
          
          {onReset && (
            <Button
              variant="outline"
              onClick={onReset}
              className="flex-1 gap-2"
            >
              <Home className="w-4 h-4" />
              Go Back
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
