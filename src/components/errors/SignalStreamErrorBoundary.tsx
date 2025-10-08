/**
 * Signal Stream Error Boundary - Area 5 Implementation
 * 
 * Isolates errors in signal streaming to prevent full-page crashes
 * Provides user-friendly error recovery UI
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

export class SignalStreamErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('🚨 SignalStream Error Boundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Send to monitoring service
    this.props.onError?.(error, errorInfo);

    // Send to PostHog or other analytics
    if (typeof window !== 'undefined' && (window as any).posthog) {
      (window as any).posthog.capture('signal_stream_error', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack?.substring(0, 500)
      });
    }
  }

  handleRetry = (): void => {
    console.log('🔄 SignalStream: User triggered retry');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleRefresh = (): void => {
    console.log('🔄 SignalStream: User triggered full page refresh');
    window.location.reload();
  };

  handleGoHome = (): void => {
    console.log('🏠 SignalStream: User navigating to home');
    window.location.href = '/dashboard';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorCount } = this.state;

      // If error persists after multiple retries, suggest refresh
      const suggestRefresh = errorCount >= 2;

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-2xl w-full">
            <Alert variant="destructive" className="border-2">
              <AlertTriangle className="h-5 w-5" />
              <AlertDescription>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">Signal Stream Temporarily Unavailable</h3>
                    <p className="text-sm mt-2 opacity-90">
                      {suggestRefresh 
                        ? 'The signal stream encountered a persistent error. Please refresh the page to restore functionality.'
                        : 'Something went wrong while loading the signal stream. This is usually temporary.'}
                    </p>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {!suggestRefresh && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={this.handleRetry}
                        className="bg-background"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                      </Button>
                    )}
                    
                    <Button 
                      size="sm" 
                      onClick={this.handleRefresh}
                      className="bg-background hover:bg-background/80"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Page
                    </Button>

                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={this.handleGoHome}
                      className="bg-background"
                    >
                      <Home className="h-4 w-4 mr-2" />
                      Go to Dashboard
                    </Button>
                  </div>

                  {error && (
                    <details className="text-xs opacity-75 mt-4">
                      <summary className="cursor-pointer hover:opacity-100">Technical Details</summary>
                      <div className="mt-2 p-3 bg-background/50 rounded font-mono text-xs overflow-auto max-h-32">
                        <div className="font-semibold mb-1">Error:</div>
                        <div>{error.message}</div>
                        {errorCount > 1 && (
                          <div className="mt-2 text-yellow-500">
                            ⚠️ Error occurred {errorCount} times
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SignalStreamErrorBoundary;
