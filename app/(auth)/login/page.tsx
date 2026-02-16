import { Suspense } from 'react';
import Link from 'next/link';
import { AuthCard, LoginForm } from '@/modules/auth';

export const metadata = {
  title: 'Sign In | VECTERAI',
  description: 'Sign in to your VECTERAI account',
};

/**
 * Login page with email/password authentication.
 */
export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to your account to continue"
      footer={
        <p className="text-gray-400">
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="text-electric-blue hover:text-electric-blue-400 font-medium transition-colors"
          >
            Sign up
          </Link>
        </p>
      }
    >
      <Suspense fallback={<div className="h-64 animate-pulse bg-white/5 rounded-lg" />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
