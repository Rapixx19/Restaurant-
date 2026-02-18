'use client';

import { Suspense, type ReactNode } from 'react';
import { ProgressBar } from './ProgressBar';
import { PageTransition } from './PageTransition';

interface DashboardShellProps {
  children: ReactNode;
}

/**
 * Client-side shell for dashboard that provides:
 * - Top progress bar on route changes
 * - Page transition animations
 * - Minimum height to prevent CLS
 */
export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <>
      {/* Progress bar at top of viewport */}
      <Suspense fallback={null}>
        <ProgressBar />
      </Suspense>

      {/* Main content with transition animation */}
      <main className="lg:pl-64 min-h-[calc(100vh-4rem)]">
        <PageTransition className="px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </PageTransition>
      </main>
    </>
  );
}
