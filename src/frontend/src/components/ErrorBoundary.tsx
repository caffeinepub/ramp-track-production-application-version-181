import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDiagnostics: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDiagnostics: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearCache = () => {
    // Clear localStorage
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Unregister service workers
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });
    }
    
    // Clear cache storage
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name);
        });
      });
    }
    
    // Reload after clearing
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  toggleDiagnostics = () => {
    this.setState((prev) => ({ showDiagnostics: !prev.showDiagnostics }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="fixed inset-0 flex items-center justify-center p-6"
          style={{
            backgroundImage: 'url(/assets/HomescreenBackground.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div
            className="w-full max-w-2xl rounded-2xl p-8 shadow-2xl"
            style={{
              background: 'rgba(15, 23, 42, 0.95)',
            }}
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="shrink-0">
                <AlertCircle className="h-12 w-12 text-red-400" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-2">
                  Something went wrong
                </h1>
                <p className="text-white/80 text-lg">
                  The application encountered an unexpected error. Please reload the page to continue.
                </p>
              </div>
            </div>

            {this.state.showDiagnostics && this.state.error && (
              <div className="mb-6 p-4 bg-black/40 rounded-lg border border-white/10">
                <h3 className="text-white font-semibold mb-2">Error Details:</h3>
                <pre className="text-red-300 text-xs overflow-auto max-h-48">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={this.handleReload}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 text-lg"
              >
                Reload Application
              </Button>

              <Button
                onClick={this.handleClearCache}
                variant="outline"
                className="w-full bg-white/10 hover:bg-white/20 text-white border-white/30 font-semibold py-6 text-lg"
              >
                Clear Cache & Reload
              </Button>

              <Button
                onClick={this.toggleDiagnostics}
                variant="ghost"
                className="w-full text-white/70 hover:text-white hover:bg-white/10"
              >
                {this.state.showDiagnostics ? 'Hide' : 'Show'} Diagnostics
              </Button>
            </div>

            <div className="mt-6 pt-6 border-t border-white/20">
              <p className="text-white/60 text-sm text-center">
                If the problem persists, please contact support.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

