import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Authentication | VECTERAI',
  description: 'Sign in or create an account for VECTERAI',
};

interface AuthLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout for authentication pages (login, signup).
 * Provides a minimal wrapper without the main navigation.
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return <>{children}</>;
}
