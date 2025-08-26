
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
}

export class SignalStreamErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    console.error('SignalStreamErrorBoundary caught error:', error);
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SignalStreamErrorBoundary - Full error details:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
    
    this.setState({
      error,
      errorInfo
    });
  }

  private handleRetry = () => {
    console.log('SignalStreamErrorBoundary - Retrying...');
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      return (
        <div className="min-h-screen bg-background p-4 flex items-center justify-center">
          <Card className="border-destructive/50 bg-destructive/5 max-w-2xl w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Signal Stream Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The Signal Stream encountered an error and couldn't load properly. This might be due to:
              </p>
              
              <ul className="text-sm text-muted-foreground list-disc pl-6 space-y-1">
                <li>Network connectivity issues</li>
                <li>Authentication problems</li>
                <li>Real-time service unavailable</li>
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
                <Button 
                  onClick={this.handleRetry}
                  variant="outline"
                  size="sm"
                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
