import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  symbol?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorId: string;
}

/**
 * 🚀 REACT QUEUE HARDENING: Specialized ErrorBoundary for LivePriceWidget
 * Catches and handles React "Should have a queue" errors and other component failures
 */
export class LivePriceWidgetErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorId: `lpw-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `lpw-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // 🚀 ENHANCED ERROR LOGGING: Detailed component stack and props for debugging
    const errorDetails = {
      errorId: this.state.errorId,
      symbol: this.props.symbol,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      componentStack: errorInfo.componentStack,
      errorBoundary: 'LivePriceWidgetErrorBoundary',
      timestamp: new Date().toISOString(),
      retryCount: this.retryCount,
      userAgent: navigator.userAgent,
      location: window.location.href,
    };

    console.error('🚨 LivePriceWidget Error Boundary Triggered:', errorDetails);

    // 🚀 REACT DUPLICATE DETECTION: Check for common React issues
    if (error.message.includes('Should have a queue') || 
        error.message.includes('Cannot update a component') ||
        error.message.includes('duplicate React')) {
      console.error('🔍 Detected React Queue/Duplicate Issue:', {
        errorId: this.state.errorId,
        symbol: this.props.symbol,
        possibleCause: 'Multiple React instances or state update after unmount',
        recommendation: 'Check for duplicate React packages or async state updates'
      });
    }

    // Report to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // Could integrate with error reporting service here
      console.warn('Production error in LivePriceWidget:', errorDetails);
    }
  }

  handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        errorId: `lpw-retry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });
    }
  };

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const canRetry = this.retryCount < this.maxRetries;

      return (
        <Alert variant="destructive" className="m-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex flex-col gap-2">
            <div>
              <strong>Price widget error</strong>
              {this.props.symbol && (
                <span className="text-sm text-muted-foreground ml-2">
                  ({this.props.symbol})
                </span>
              )}
            </div>
            
            <div className="text-sm text-muted-foreground">
              {this.state.error?.message || 'An unexpected error occurred'}
            </div>

            <div className="flex gap-2 mt-2">
              {canRetry && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={this.handleRetry}
                  className="flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry ({this.maxRetries - this.retryCount} left)
                </Button>
              )}
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={this.handleRefresh}
                className="flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Refresh Page
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer text-muted-foreground">
                  Error Details (Dev)
                </summary>
                <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                  {this.state.error.stack}
                </pre>
                {this.state.errorInfo && (
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

/**
 * 🚀 REACT DUPLICATE DETECTION: Runtime check for multiple React instances
 */
export const detectDuplicateReact = () => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    // Check for multiple React instances
    const reactVersions = [];
    
    // Check global React
    if (window.React) {
      reactVersions.push(`Global: ${window.React.version || 'unknown'}`);
    }
    
    // Check for duplicate React in different module scopes
    try {
      const moduleReact = require('react');
      if (moduleReact && moduleReact.version) {
        reactVersions.push(`Module: ${moduleReact.version}`);
      }
    } catch (e) {
      // Module not found or other error
    }
    
    if (reactVersions.length > 1) {
      console.warn('🚨 Multiple React instances detected:', reactVersions);
      console.warn('This may cause "Should have a queue" errors. Check webpack/vite aliases.');
    }
  }
};

// Run duplicate detection in development
detectDuplicateReact();