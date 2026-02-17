'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  /** Optional component name for error tracking */
  componentName?: string;
  /** Minimal mode hides the error UI completely */
  minimal?: boolean;
  /** Callback when an error occurs */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary Component
 *
 * Catches JavaScript errors in child component tree and displays a fallback UI.
 * Prevents a single component crash from breaking the entire dashboard.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary componentName="SmartTranscript">
 *   <SmartTranscript transcript={data} />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for monitoring
    const componentName = this.props.componentName || 'Unknown';

    // In production, this could be sent to an error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Structured error logging
      console.error(
        JSON.stringify({
          type: 'react_error_boundary',
          component: componentName,
          message: error.message,
          stack: errorInfo.componentStack,
        })
      );
    } else {
      console.error(`[ErrorBoundary] Error in ${componentName}:`, error, errorInfo);
    }

    // Call optional error callback
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Return custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Minimal mode - return nothing
      if (this.props.minimal) {
        return null;
      }

      // Default error UI
      return (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-red-400">
                Something went wrong
              </h3>
              <p className="mt-1 text-sm text-gray-400">
                {this.props.componentName
                  ? `The ${this.props.componentName} component encountered an error.`
                  : 'This component encountered an error.'}
              </p>
              {process.env.NODE_ENV !== 'production' && this.state.error && (
                <pre className="mt-2 text-xs text-red-300/70 overflow-auto max-h-24">
                  {this.state.error.message}
                </pre>
              )}
            </div>
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Compact error fallback for inline components.
 */
export function CompactErrorFallback({
  message = 'Unable to load',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <AlertTriangle className="w-4 h-4 text-amber-400" />
      <span>{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-electric-blue hover:underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}
