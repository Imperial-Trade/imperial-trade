
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Detect chunk loading errors
    const errorMessage = error?.message || '';
    const isChunkLoadError = 
      errorMessage.includes('Failed to fetch dynamically imported module') ||
      errorMessage.includes('Importing a module script failed') ||
      errorMessage.includes('error loading dynamically imported module') ||
      errorMessage.includes('ChunkLoadError');

    if (isChunkLoadError) {
      console.log('🔄 [ErrorBoundary] Detected chunk loading error, attempting recovery...');
      
      const hasAlreadyRefreshed = sessionStorage.getItem('error-boundary-chunk-refresh') === 'true';
      
      if (!hasAlreadyRefreshed) {
        // First time - attempt automatic recovery
        sessionStorage.setItem('error-boundary-chunk-refresh', 'true');
        
        // Clear service worker cache if present
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(registration => registration.unregister());
          });
        }
        
        // Clear all caches
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
          });
        }
        
        // Clear localStorage caches
        Object.keys(localStorage).forEach(key => {
          if (key.includes('cache') || key.includes('version') || key.includes('chunk')) {
            localStorage.removeItem(key);
          }
        });
        
        // Reload after cleanup
        console.log('🔄 [ErrorBoundary] Reloading page after cache cleanup...');
        setTimeout(() => window.location.reload(), 1000);
        return;
      }
      
      // If reload didn't help, clear flag and show error
      console.error('❌ [ErrorBoundary] Chunk error persists after reload');
      sessionStorage.removeItem('error-boundary-chunk-refresh');
    }
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Component Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-red-600">
              {this.props.componentName 
                ? `The ${this.props.componentName} component encountered an error and couldn't render properly.`
                : 'This component encountered an error and couldn\'t render properly.'
              }
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-red-100 p-3 rounded text-xs text-red-800 font-mono overflow-auto">
                {this.state.error.message}
              </div>
            )}
            
            <Button 
              onClick={this.handleRetry}
              variant="outline"
              size="sm"
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
