import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { DashboardNav } from '@/modules/dashboard/components/DashboardNav';
import type { Profile, Restaurant } from '@/lib/database.types';
import type { OrganizationUsage } from '@/modules/dashboard/types';

export const metadata: Metadata = {
  title: 'Dashboard | VECTERAI',
  description: 'Manage your restaurant with VECTERAI',
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * Fetch organization usage data for the sidebar.
 */
async function getOrganizationUsage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  organizationId: string | null
): Promise<OrganizationUsage | undefined> {
  if (!organizationId) return undefined;

  // Get organization with plan info
  const { data: org } = await supabase
    .from('organizations')
    .select(`
      id,
      owner_id,
      voice_minutes_used,
      plan:plan_configs (
        name,
        display_name,
        minute_limit,
        location_limit
      )
    `)
    .eq('id', organizationId)
    .single() as {
      data: {
        id: string;
        owner_id: string;
        voice_minutes_used: number;
        plan: {
          name: string;
          display_name: string;
          minute_limit: number;
          location_limit: number;
        } | null;
      } | null;
    };

  if (!org) return undefined;

  // Count restaurants in organization
  const { count: locationCount } = await supabase
    .from('restaurants')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  return {
    planName: org.plan?.name ?? 'free',
    planDisplayName: org.plan?.display_name ?? 'Free',
    voiceMinutesUsed: org.voice_minutes_used ?? 0,
    voiceMinutesLimit: org.plan?.minute_limit ?? 50,
    locationsUsed: locationCount ?? 1,
    locationsLimit: org.plan?.location_limit ?? 1,
    isOwner: org.owner_id === userId,
    organizationId: org.id,
  };
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

  // Fetch user's restaurant (if any) with organization_id
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', user.id)
    .single() as { data: (Restaurant & { organization_id?: string }) | null };

  // Get current path to check if we're on onboarding
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';
  const isOnboardingPath = pathname.startsWith('/onboarding');

  // Redirect to onboarding if user has no restaurant and not already on onboarding
  if (!restaurant && !isOnboardingPath) {
    redirect('/onboarding');
  }

  // Fetch organization usage for sidebar
  const organizationUsage = restaurant?.organization_id
    ? await getOrganizationUsage(supabase, user.id, restaurant.organization_id)
    : undefined;

  return (
    <div className="min-h-screen bg-deep-navy">
      <DashboardNav
        user={user}
        profile={profile}
        restaurant={restaurant}
        organizationUsage={organizationUsage}
      />
      <main className="lg:pl-64">
        <div className="px-4 sm:px-6 lg:px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
