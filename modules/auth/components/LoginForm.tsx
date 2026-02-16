'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { login } from '../actions/login';
import { AuthInput } from './AuthInput';
import { AuthButton } from './AuthButton';
import type { AuthFormState } from '../types';

const initialState: AuthFormState = {
  error: null,
  success: false,
};

/**
 * Submit button with pending state.
 */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <AuthButton loading={pending}>
      {pending ? 'Signing in...' : 'Sign in'}
    </AuthButton>
  );
}

/**
 * Login form component with server action.
 */
export function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const [state, formAction] = useFormState(login, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="redirect" value={redirectTo} />

      {state.error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{state.error}</p>
        </div>
      )}

      <AuthInput
        id="email"
        name="email"
        type="email"
        label="Email"
        placeholder="you@example.com"
        required
        autoComplete="email"
      />

      <AuthInput
        id="password"
        name="password"
        type="password"
        label="Password"
        placeholder="Enter your password"
        required
        autoComplete="current-password"
      />

      <SubmitButton />
    </form>
  );
}
