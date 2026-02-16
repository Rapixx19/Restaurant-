'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { AuthFormState } from '../types';

/**
 * Server action to handle user signup.
 * Passes full_name in options.data to trigger the handle_new_user function
 * which creates the profile record.
 */
export async function signup(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;

  if (!email || !password) {
    return {
      error: 'Email and password are required',
      success: false,
    };
  }

  if (password.length < 8) {
    return {
      error: 'Password must be at least 8 characters',
      success: false,
    };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || null,
      },
    },
  });

  if (error) {
    return {
      error: error.message,
      success: false,
    };
  }

  // Redirect to dashboard after successful signup
  // The middleware will handle the session
  redirect('/dashboard');
}
