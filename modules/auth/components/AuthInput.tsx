'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { AuthInputProps } from '../types';

/**
 * Styled input component for auth forms.
 */
export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ id, name, type, label, placeholder, required, autoComplete, disabled }, ref) => {
    return (
      <div className="space-y-2">
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-300"
        >
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
        <input
          ref={ref}
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          disabled={disabled}
          className={cn(
            'w-full px-4 py-3 rounded-lg',
            'bg-white/5 border border-white/10',
            'text-white placeholder-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-transparent',
            'transition-all duration-200',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        />
      </div>
    );
  }
);

AuthInput.displayName = 'AuthInput';
