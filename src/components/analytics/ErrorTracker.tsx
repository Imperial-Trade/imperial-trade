
import React, { Component, ReactNode } from 'react';
import { usePostHog } from '@/contexts/PostHogContext';

interface ErrorTrackerProps {
  children: ReactNode;
  fallback?: ReactNode;
  trackingContext?: Record<string, any>;
}

interface ErrorTrackerState {
  hasError: boolean;
  error?: Error;
}

// Error boundary that automatically tracks errors to PostHog
export class ErrorTracker extends Component<ErrorTrackerProps, ErrorTrackerState> {
  private trackError?: (error: Error, context?: Record<string, any>) => void;

  constructor(props: ErrorTrackerProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorTrackerState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorTracker caught an error:', error, errorInfo);
    
    // Track error to PostHog if available
    if (this.trackError) {
      this.trackError(error, {
        ...this.props.trackingContext,
        error_boundary: true,
        component_stack: errorInfo.componentStack,
        error_info: errorInfo,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        timestamp: Date.now(),
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 border border-red-300 rounded-md bg-red-50">
          <p className="text-red-800">Something went wrong. Please refresh the page.</p>
        </div>
      );
    }

    return (
      <ErrorTrackerProvider onTrackError={(trackError) => this.trackError = trackError}>
        {this.props.children}
      </ErrorTrackerProvider>
    );
  }
}

// Provider component to inject trackError function
function ErrorTrackerProvider({ 
  children, 
  onTrackError 
}: { 
  children: ReactNode; 
  onTrackError: (trackError: (error: Error, context?: Record<string, any>) => void) => void;
}) {
  const { trackError } = usePostHog();
  
  React.useEffect(() => {
    onTrackError(trackError);
  }, [trackError, onTrackError]);

  return <>{children}</>;
}

// Hook for manual error tracking
export function useErrorTracking() {
  const { trackError, isEnabled } = usePostHog();

  const trackManualError = React.useCallback((error: Error | string, context?: Record<string, any>) => {
    if (!isEnabled) return;
    
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    trackError(errorObj, {
      ...context,
      manual_tracking: true,
      timestamp: Date.now(),
    });
  }, [trackError, isEnabled]);

  return { trackManualError };
}
