/**
 * Price Widget Error Boundary - Area 5 Implementation
 * 
 * Isolates errors in price widgets to prevent cascade failures
 * Provides graceful degradation for price display failures
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  symbol?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class PriceWidgetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('🚨 Price Widget Error:', {
      symbol: this.props.symbol,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    // Send to monitoring
    if (typeof window !== 'undefined' && (window as any).posthog) {
      (window as any).posthog.capture('price_widget_error', {
        symbol: this.props.symbol,
        error: error.message
      });
    }
  }

  componentDidUpdate(prevProps: Props): void {
    // Reset error state if symbol changes (new widget)
    if (this.state.hasError && prevProps.symbol !== this.props.symbol) {
      this.setState({
        hasError: false,
        error: null
      });
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/30 rounded text-sm">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-destructive">
            Price unavailable
            {this.props.symbol && ` for ${this.props.symbol}`}
          </span>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PriceWidgetErrorBoundary;
