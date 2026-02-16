import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { DashboardNav } from '@/modules/dashboard/components/DashboardNav';
import type { Profile, Restaurant } from '@/lib/database.types';

export const metadata: Metadata = {
  title: 'Dashboard | VECTERAI',
  description: 'Manage your restaurant with VECTERAI',
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout for dashboard pages.
 * Includes authentication check, restaurant verification, and dashboard navigation.
 *
 * RED/YELLOW ZONE LOGIC:
 * - If user is not authenticated → redirect to /login
 * - If user has no restaurant AND not on /onboarding → redirect to /onboarding
 */
export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null };

  // Fetch user's restaurant (if any)
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', user.id)
    .single() as { data: Restaurant | null };

  // Get current path to check if we're on onboarding
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';
  const isOnboardingPath = pathname.startsWith('/onboarding');

  // Redirect to onboarding if user has no restaurant and not already on onboarding
  if (!restaurant && !isOnboardingPath) {
    redirect('/onboarding');
  }

  return (
    <div className="min-h-screen bg-deep-navy">
      <DashboardNav user={user} profile={profile} restaurant={restaurant} />
      <main className="lg:pl-64">
        <div className="px-4 sm:px-6 lg:px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
