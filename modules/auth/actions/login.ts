'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { AuthFormState } from '../types';

/**
 * Server action to handle user login.
 * Uses signInWithPassword for email/password authentication.
 */
export async function login(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return {
      error: 'Email and password are required',
      success: false,
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error: error.message,
      success: false,
    };
  }

  // Get redirect URL from form data or default to dashboard
  const redirectTo = (formData.get('redirect') as string) || '/dashboard';
  redirect(redirectTo);
}
