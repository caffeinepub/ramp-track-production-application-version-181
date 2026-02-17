import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { clearCachedApp } from '../lib/clearCachedApp';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDiagnostics: boolean;
}

class ErrorBoundary extends Component<Props, State> {
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
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearCache = async () => {
    await clearCachedApp();
  };

  toggleDiagnostics = () => {
    this.setState((prev) => ({ showDiagnostics: !prev.showDiagnostics }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center p-6"
          style={{
            backgroundImage: 'url(/assets/HomescreenBackground.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="w-full max-w-2xl bg-slate-900/95 rounded-2xl p-8 shadow-2xl border border-slate-700">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0">
                <AlertCircle className="h-12 w-12 text-red-400" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
                <p className="text-slate-300 mb-4">
                  The application encountered an unexpected error. Try reloading the page or clearing the cache.
                </p>

                <div className="flex flex-wrap gap-3 mb-6">
                  <Button onClick={this.handleReload} className="bg-blue-600 hover:bg-blue-700">
                    Reload Page
                  </Button>
                  <Button
                    onClick={this.handleClearCache}
                    variant="outline"
                    className="bg-red-900/20 hover:bg-red-900/40 text-red-300 border-red-700"
                  >
                    Clear Cache & Reload
                  </Button>
                  <Button
                    onClick={this.toggleDiagnostics}
                    variant="ghost"
                    className="text-slate-400 hover:text-white"
                  >
                    {this.state.showDiagnostics ? 'Hide' : 'Show'} Details
                  </Button>
                </div>

                {this.state.showDiagnostics && (
                  <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">Error Details</h3>
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Error Message:</div>
                        <pre className="text-xs text-red-300 font-mono overflow-x-auto">
                          {this.state.error?.message || 'Unknown error'}
                        </pre>
                      </div>
                      {this.state.error?.stack && (
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Stack Trace:</div>
                          <pre className="text-xs text-slate-400 font-mono overflow-x-auto max-h-48 overflow-y-auto">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      )}
                      {this.state.errorInfo?.componentStack && (
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Component Stack:</div>
                          <pre className="text-xs text-slate-400 font-mono overflow-x-auto max-h-48 overflow-y-auto">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
