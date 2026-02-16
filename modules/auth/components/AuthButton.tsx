'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AuthButtonProps } from '../types';

/**
 * Styled button component for auth forms.
 */
export function AuthButton({
  type = 'submit',
  loading = false,
  children,
  onClick,
  disabled,
}: AuthButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'w-full flex items-center justify-center gap-2',
        'px-6 py-3 rounded-lg',
        'bg-electric-blue hover:bg-electric-blue-600',
        'text-white font-semibold',
        'transition-all duration-200',
        'hover:shadow-lg hover:shadow-electric-blue/25',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none'
      )}
    >
      {loading && <Loader2 className="w-5 h-5 animate-spin" />}
      {children}
    </button>
  );
}
