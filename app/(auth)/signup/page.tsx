import Link from 'next/link';
import { AuthCard, SignupForm } from '@/modules/auth';

export const metadata = {
  title: 'Sign Up | VECTERAI',
  description: 'Create your VECTERAI account',
};

/**
 * Signup page with email/password registration.
 * Passes full_name in options.data to trigger profile creation.
 */
export default function SignupPage() {
  return (
    <AuthCard
      title="Create an account"
      description="Get started with VECTERAI today"
      footer={
        <p className="text-gray-400">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-electric-blue hover:text-electric-blue-400 font-medium transition-colors"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <SignupForm />
    </AuthCard>
  );
}
