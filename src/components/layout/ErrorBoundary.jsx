import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';
import { captureException } from '../../lib/errorReporter';
import { isDevelopment } from '../../lib/config';

/**
 * Global error boundary that catches React rendering errors.
 * Shows user-friendly fallback UI with recovery options.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    const severity = this.props.severity || 'fatal';
    captureException(error, {
      component: 'ErrorBoundary',
      severity,
      extra: {
        componentStack: errorInfo?.componentStack,
      },
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleToggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  handleRecover = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const severity = this.props.severity || 'fatal';
    const isRecoverable = severity === 'recoverable';

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4" role="alert">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="w-12 h-12 text-amber-500" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h1>
          <p className="text-gray-600 mb-6">
            {isRecoverable
              ? 'An error occurred, but you can try again.'
              : 'An unexpected error occurred. Please reload the page or go back to the home page.'}
          </p>

          <div className="flex flex-col gap-3">
            {isRecoverable && (
              <button
                onClick={this.handleRecover}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            )}
            <button
              onClick={this.handleReload}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </button>
            <button
              onClick={this.handleGoHome}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              <Home className="w-4 h-4" />
              Go to Home
            </button>
          </div>

          {isDevelopment && this.state.error && (
            <div className="mt-6 text-left">
              <button
                onClick={this.handleToggleDetails}
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                {this.state.showDetails ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                Error Details
              </button>
              {this.state.showDetails && (
                <div className="mt-2 p-3 bg-red-50 rounded text-xs text-red-800 overflow-auto max-h-48">
                  <p className="font-semibold">{this.state.error.message}</p>
                  <pre className="mt-2 whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="mt-2 whitespace-pre-wrap text-red-600">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}
