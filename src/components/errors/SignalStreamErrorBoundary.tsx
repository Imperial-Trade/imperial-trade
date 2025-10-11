import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

/**
 * Error Boundary for Signal Stream
 * Provides graceful error handling and recovery options
 */
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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[SignalStreamErrorBoundary] Caught error:', error);
    console.error('[SignalStreamErrorBoundary] Error info:', errorInfo);

    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Log to analytics/monitoring service
    if (typeof window !== 'undefined' && (window as any).posthog) {
      (window as any).posthog.capture('signal_stream_error', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorCount: this.state.errorCount + 1
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-6 w-6" />
              <h2 className="text-xl font-semibold">Signal Stream Error</h2>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Something went wrong while loading the signal stream. This has been logged and our team will investigate.
              </p>

              {this.state.error && (
                <details className="mt-4">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    Technical Details
                  </summary>
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                    {this.state.error.message}
                  </pre>
                </details>
              )}

              {this.state.errorCount > 2 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded p-3 text-xs text-destructive">
                  <strong>Multiple errors detected.</strong> Please try refreshing the page or contact support if the issue persists.
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={this.handleReset}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button
                onClick={this.handleRefresh}
                variant="default"
                size="sm"
                className="flex-1"
              >
                Refresh Page
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="ghost"
                size="sm"
              >
                <Home className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SignalStreamErrorBoundary;
