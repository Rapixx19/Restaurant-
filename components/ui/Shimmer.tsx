'use client';

import { cn } from '@/lib/utils';

interface ShimmerProps {
  className?: string;
  /** Width of the shimmer element */
  width?: string;
  /** Height of the shimmer element */
  height?: string;
}

/**
 * Shimmer loading placeholder for text/content.
 * Use instead of "Loading..." text to prevent layout shift.
 */
export function Shimmer({ className, width = 'w-24', height = 'h-4' }: ShimmerProps) {
  return (
    <div
      className={cn(
        'bg-white/10 rounded shimmer',
        width,
        height,
        className
      )}
    />
  );
}

/**
 * Shimmer text that shows actual content when ready.
 * Falls back to shimmer if content is empty/null.
 */
export function ShimmerText({
  children,
  loading,
  className,
  shimmerWidth = 'w-24',
}: {
  children: React.ReactNode;
  loading?: boolean;
  className?: string;
  shimmerWidth?: string;
}) {
  if (loading || !children) {
    return <Shimmer width={shimmerWidth} className={className} />;
  }

  return <span className={className}>{children}</span>;
}
