import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

export class WebSocketErrorBoundary extends Component<Props, State> {
  private retryTimer?: NodeJS.Timeout;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('WebSocket Error Boundary caught an error:', error, errorInfo);
  }

  componentWillUnmount() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        retryCount: prevState.retryCount + 1
      }));
    } else {
      // Force page reload after max retries
      window.location.reload();
    }
  };

  handleAutoRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.retryTimer = setTimeout(() => {
        this.handleRetry();
      }, 2000 * (this.state.retryCount + 1)); // Progressive delay
    }
  };

  render() {
    if (this.state.hasError) {
      const canRetry = this.state.retryCount < this.maxRetries;
      
      // Auto-retry for the first few attempts
      if (canRetry && this.state.retryCount < 2) {
        this.handleAutoRetry();
      }

      return (
        <div className="min-h-[200px] flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-yellow-500 mr-2" />
              <h3 className="text-lg font-semibold">WebSocket Connection Issue</h3>
            </div>
            
            <p className="text-muted-foreground max-w-md">
              {this.state.retryCount < 2 
                ? 'Automatically retrying connection...' 
                : 'Having trouble connecting to real-time data services.'
              }
            </p>

            {this.state.error && (
              <details className="text-left bg-muted p-3 rounded text-sm">
                <summary className="cursor-pointer font-medium">Technical Details</summary>
                <pre className="mt-2 whitespace-pre-wrap break-words">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <div className="flex gap-2 justify-center">
              {canRetry ? (
                <button
                  onClick={this.handleRetry}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry Connection ({this.state.retryCount + 1}/{this.maxRetries + 1})
                </button>
              ) : (
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh Page
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}