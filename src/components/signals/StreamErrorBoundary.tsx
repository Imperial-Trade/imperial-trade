import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class StreamErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Signal Stream Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#000000' }}>
          <div className="max-w-md w-full">
            <Alert style={{ background: 'rgba(255, 69, 58, 0.12)', border: '1px solid rgba(255, 69, 58, 0.3)' }}>
              <AlertTriangle className="h-4 w-4" style={{ color: '#FF453A' }} />
              <AlertDescription>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold" style={{ color: '#FFFFFF' }}>Something went wrong with the Signal Stream</h3>
                    <p className="text-sm mt-1" style={{ color: '#EBEBF5' }}>
                      We're working to fix this issue. Please try refreshing the page.
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => window.location.reload()}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Page
                    </Button>
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => this.setState({ hasError: false })}
                    >
                      Try Again
                    </Button>
                  </div>
                  
                  {this.state.error && (
                    <details className="text-xs text-muted-foreground">
                      <summary>Technical Details</summary>
                      <pre className="mt-2 text-xs overflow-auto">
                        {this.state.error.message}
                      </pre>
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

export default StreamErrorBoundary;