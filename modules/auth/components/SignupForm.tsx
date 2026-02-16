'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { AlertCircle } from 'lucide-react';
import { signup } from '../actions/signup';
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
      {pending ? 'Creating account...' : 'Create account'}
    </AuthButton>
  );
}

/**
 * Signup form component with server action.
 * Passes full_name to trigger profile creation via handle_new_user.
 */
export function SignupForm() {
  const [state, formAction] = useFormState(signup, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{state.error}</p>
        </div>
      )}

      <AuthInput
        id="fullName"
        name="fullName"
        type="text"
        label="Full Name"
        placeholder="John Doe"
        autoComplete="name"
      />

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
        placeholder="At least 8 characters"
        required
        autoComplete="new-password"
      />

      <SubmitButton />

      <p className="text-xs text-gray-500 text-center">
        By signing up, you agree to our{' '}
        <a href="/terms" className="text-electric-blue hover:underline">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="/privacy" className="text-electric-blue hover:underline">
          Privacy Policy
        </a>
        .
      </p>
    </form>
  );
}
