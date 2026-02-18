'use client';

import { Suspense, type ReactNode } from 'react';
import { ProgressBar } from './ProgressBar';
import { PageTransition } from './PageTransition';
import { ErrorBoundary } from './ErrorBoundary';

interface DashboardShellProps {
  children: ReactNode;
}

/**
 * Dashboard Error Fallback UI
 * Shown when a page component crashes
 */
function DashboardErrorFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <div className="w-16 h-16 mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">Something went wrong</h2>
      <p className="text-gray-400 mb-6 max-w-md">
        We encountered an error loading this page. Please try refreshing or contact support if the issue persists.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-electric-blue hover:bg-electric-blue/90 text-white rounded-lg transition-colors"
      >
        Refresh Page
      </button>
    </div>
  );
}

/**
 * Client-side shell for dashboard that provides:
 * - Top progress bar on route changes
 * - Page transition animations
 * - Error boundary to catch crashes
 * - Minimum height to prevent CLS
 */
export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <>
      {/* Progress bar at top of viewport */}
      <Suspense fallback={null}>
        <ProgressBar />
      </Suspense>

      {/* Main content with transition animation and error boundary */}
      <main className="lg:pl-64 min-h-[calc(100vh-4rem)]">
        <ErrorBoundary
          componentName="DashboardPage"
          fallback={<DashboardErrorFallback />}
          onError={(error, errorInfo) => {
            console.error('🚨 Dashboard Error:', {
              message: error.message,
              stack: error.stack,
              componentStack: errorInfo.componentStack,
            });
          }}
        >
          <PageTransition className="px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </PageTransition>
        </ErrorBoundary>
      </main>
    </>
  );
}
