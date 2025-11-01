import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Router } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  isRouterError: boolean;
}

export class RouterErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    isRouterError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Check if this is a router/navigation related error
    const isRouterError = error.message.includes('useNavigate') || 
                         error.message.includes('Router') ||
                         error.message.includes('useContext') ||
                         error.message.toLowerCase().includes('navigation');
    
    return { 
      hasError: true, 
      error,
      isRouterError
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('RouterErrorBoundary caught an error:', error, errorInfo);
    
    // Log router-specific debugging info
    if (this.state.isRouterError) {
      console.error('Router context state:', {
        location: window.location,
        pathname: window.location.pathname,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });
    }
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, isRouterError: false });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="border-destructive/50 bg-destructive/5 mx-4 my-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              {this.state.isRouterError ? (
                <Router className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
              {this.state.isRouterError ? 'Navigation Error' : 'Component Error'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {this.state.isRouterError ? (
                'The navigation system encountered an error. This may be due to a context initialization issue.'
              ) : (
                'A component error occurred. Please try refreshing the page.'
              )}
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-destructive/10 p-3 rounded text-xs text-destructive font-mono overflow-auto max-h-32">
                {this.state.error.message}
                {this.state.error.stack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer">Stack trace</summary>
                    <pre className="mt-1 text-xs">{this.state.error.stack}</pre>
                  </details>
                )}
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
                Retry
              </Button>
              
              {this.state.isRouterError && (
                <Button 
                  onClick={this.handleReload}
                  variant="destructive"
                  size="sm"
                >
                  Reload Page
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}