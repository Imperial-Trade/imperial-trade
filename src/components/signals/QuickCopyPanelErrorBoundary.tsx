import React, { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class QuickCopyPanelErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[QuickCopyPanel] Error:', error, errorInfo);
    
    // Log to PostHog if available
    if (typeof window !== 'undefined' && (window as any).posthog) {
      (window as any).posthog.capture('quick_copy_panel_error', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive" className="m-3">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <p className="text-sm">Unable to load Quick Copy panel.</p>
            <details className="text-xs mt-2 opacity-70">
              <summary>Technical Details</summary>
              <pre className="mt-1 overflow-auto">
                {this.state.error?.message || 'Unknown error'}
              </pre>
            </details>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}
