
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Shield } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  contextName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

export class ContextErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    retryCount: 0
  };

  public static getDerivedStateFromError(error: Error): State {
    console.error('ContextErrorBoundary caught error:', error);
    
    // Check if this is a context-related error
    if (error.message.includes('useSignalRealtime') || 
        error.message.includes('useState') ||
        error.message.includes('Provider') ||
        error.message.includes('Context') ||
        error.message.includes('hook')) {
      return { hasError: true, error, retryCount: 0 };
    }
    
    // Re-throw non-context errors
    throw error;
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ContextErrorBoundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      contextName: this.props.contextName
    });
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    console.log(`ContextErrorBoundary - Retry attempt ${this.state.retryCount + 1}`);
    this.setState(prevState => ({ 
      hasError: false, 
      error: undefined,
      retryCount: prevState.retryCount + 1
    }));
  };

  private handleRefreshPage = () => {
    console.log('ContextErrorBoundary - Refreshing page');
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const contextName = this.props.contextName || 'Context';
      const maxRetries = 3;
      const canRetry = this.state.retryCount < maxRetries;

      return (
        <div className="min-h-screen bg-background p-4 flex items-center justify-center">
          <Card className="border-destructive/50 bg-destructive/5 max-w-lg w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {contextName} Initialization Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  The {contextName.toLowerCase()} failed to initialize properly. This may be due to:
                </p>
                <ul className="text-sm text-muted-foreground list-disc pl-6 space-y-1">
                  <li>Temporary connection issues</li>
                  <li>Authentication problems</li>
                  <li>Service unavailability</li>
                  <li>Browser compatibility issues</li>
                </ul>
              </div>

              {this.state.retryCount > 0 && (
                <div className="text-sm text-muted-foreground">
                  Retry attempt: {this.state.retryCount}/{maxRetries}
                </div>
              )}
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-destructive text-sm">Technical Details:</h4>
                  <div className="bg-destructive/10 p-3 rounded text-xs text-destructive font-mono overflow-auto max-h-32">
                    <div className="mb-1"><strong>Error:</strong> {this.state.error.message}</div>
                    {this.state.error.stack && (
                      <div className="text-xs opacity-75">
                        <strong>Stack:</strong><br />
                        {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                        {this.state.error.stack.split('\n').length > 5 && '\n...'}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex gap-2 flex-wrap">
                {canRetry && (
                  <Button 
                    onClick={this.handleRetry}
                    variant="outline"
                    size="sm"
                    className="border-destructive/30 text-destructive hover:bg-destructive/10"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                )}
                
                <Button 
                  onClick={this.handleRefreshPage}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Page
                </Button>

                <Button 
                  onClick={() => window.location.href = '/dashboard'}
                  variant="outline"
                  size="sm"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Button>
              </div>

              {!canRetry && (
                <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded">
                  If the problem persists, try refreshing the page or contact support.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
