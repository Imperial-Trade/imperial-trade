import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class RootErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Root Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);
    console.error('React version:', React.version);
  }

  private hardRefresh = async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Hard refresh cleanup error:', e);
    } finally {
      const url = new URL(window.location.href);
      url.searchParams.set('v', Date.now().toString());
      window.location.replace(url.toString());
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          fontFamily: 'system-ui, sans-serif',
          backgroundColor: '#000',
          color: '#fff'
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Imperial Trading Platform</h1>
          <p style={{ fontSize: '1.2rem', marginBottom: '2rem', textAlign: 'center' }}>
            Something went wrong. You can refresh, or perform a hard refresh to clear cached files.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '1rem 2rem',
                fontSize: '1rem',
                backgroundColor: '#d4af37',
                color: '#000',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer'
              }}
            >
              Refresh Page
            </button>
            <button
              onClick={this.hardRefresh}
              style={{
                padding: '1rem 2rem',
                fontSize: '1rem',
                backgroundColor: '#444',
                color: '#fff',
                border: '1px solid #666',
                borderRadius: '0.5rem',
                cursor: 'pointer'
              }}
            >
              Hard Refresh (Clear Cache)
            </button>
          </div>
          {this.state.error && (
            <details style={{ marginTop: '2rem', fontSize: '0.875rem' }}>
              <summary>Technical Details</summary>
              <pre style={{ padding: '1rem', backgroundColor: '#333', borderRadius: '0.25rem', marginTop: '1rem' }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}