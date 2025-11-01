import React, { useState } from 'react';
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useQueryClient } from '@tanstack/react-query';

interface AuthorizationErrorProps {
  error: Error;
  onRetry: () => void;
}

/**
 * ✅ Authorization Error Component
 * Displays user-friendly error when role fetching fails
 * Provides retry functionality and troubleshooting tips
 */
export const AuthorizationError: React.FC<AuthorizationErrorProps> = ({ 
  error, 
  onRetry 
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <div className="w-full max-w-md space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Permission Check Failed</AlertTitle>
          <AlertDescription>
            We couldn't verify your account permissions. This might be a temporary issue.
          </AlertDescription>
        </Alert>

        <div className="space-y-3 p-4 rounded-lg border bg-card">
          <h3 className="font-semibold text-sm">What you can try:</h3>
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li>• Click "Try Again" to retry the permission check</li>
            <li>• Check your internet connection</li>
            <li>• Sign out and sign back in</li>
            <li>• Contact support if the issue persists</li>
          </ul>

          <Button 
            onClick={onRetry} 
            className="w-full"
            variant="default"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center justify-between w-full p-3 text-sm rounded-lg border bg-card hover:bg-accent transition-colors"
        >
          <span className="font-medium">Technical Details</span>
          {showDetails ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {showDetails && (
          <div className="p-4 rounded-lg border bg-muted text-xs font-mono break-all">
            <div className="space-y-2">
              <div>
                <span className="font-semibold">Error Type:</span>{' '}
                <span className="text-destructive">{error.name}</span>
              </div>
              <div>
                <span className="font-semibold">Message:</span>{' '}
                <span className="text-muted-foreground">{error.message}</span>
              </div>
              {error.stack && (
                <div>
                  <span className="font-semibold">Stack:</span>
                  <pre className="mt-1 text-xs whitespace-pre-wrap text-muted-foreground">
                    {error.stack}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
