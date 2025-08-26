
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackComponent?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
}

export class SignalStreamErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      retryCount: 0 
    };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('SignalStreamErrorBoundary caught error:', error);
    return { 
      hasError: true, 
      error,
      retryCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SignalStreamErrorBoundary - Full error details:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
    
    this.setState({
      error,
      errorInfo
    });

    // Report to monitoring service (could be PostHog, Sentry, etc.)
    if (typeof window !== 'undefined' && (window as any).posthog) {
      (window as any).posthog.capture('signal_stream_error', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      console.log(`SignalStreamErrorBoundary - Retry attempt ${this.state.retryCount + 1}/${this.maxRetries}`);
      this.setState({ 
        hasError: false, 
        error: undefined, 
        errorInfo: undefined,
        retryCount: this.state.retryCount + 1
      });
    } else {
      window.location.reload();
    }
  };

  private handleRefresh = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      const isNetworkError = this.state.error?.message?.includes('Network') || 
                           this.state.error?.message?.includes('fetch') ||
                           this.state.error?.message?.includes('WebSocket');

      return (
        <div className="min-h-screen bg-background p-4 flex items-center justify-center">
          <Card className="border-destructive/50 bg-destructive/5 max-w-2xl w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                {isNetworkError ? <WifiOff className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                {isNetworkError ? 'Connection Error' : 'Xeon Stream Error'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {isNetworkError 
                  ? 'Unable to connect to the trading signal stream. Please check your internet connection.'
                  : 'The Xeon Stream encountered an error and couldn\'t load properly.'
                }
              </p>
              
              <ul className="text-sm text-muted-foreground list-disc pl-6 space-y-1">
                <li>Network connectivity issues</li>
                <li>Real-time service unavailable</li>
                <li>Authentication problems</li>
                <li>Browser compatibility issues</li>
              </ul>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-destructive">Error Details:</h4>
                  <div className="bg-destructive/10 p-3 rounded text-xs text-destructive font-mono overflow-auto max-h-40">
                    <div className="mb-2"><strong>Message:</strong> {this.state.error.message}</div>
                    {this.state.error.stack && (
                      <div><strong>Stack:</strong><br />{this.state.error.stack}</div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                {this.state.retryCount < this.maxRetries ? (
                  <Button 
                    onClick={this.handleRetry}
                    variant="outline"
                    size="sm"
                    className="border-destructive/30 text-destructive hover:bg-destructive/10"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again ({this.maxRetries - this.state.retryCount} attempts left)
                  </Button>
                ) : (
                  <Button 
                    onClick={this.handleRefresh}
                    variant="outline"
                    size="sm"
                    className="border-destructive/30 text-destructive hover:bg-destructive/10"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Page
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SignalStreamErrorBoundary;
