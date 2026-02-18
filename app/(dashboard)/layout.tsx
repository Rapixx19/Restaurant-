import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { DashboardNav } from '@/modules/dashboard/components/DashboardNav';
import { DashboardShell } from '@/components/ui/DashboardShell';
import { RestaurantProvider, type OrganizationUsage } from '@/lib/context';
import type { Profile, Restaurant } from '@/lib/database.types';

/**
 * Generate dynamic metadata based on the user's restaurant.
 * Falls back to generic title if restaurant not found.
 */
export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      title: 'Dashboard | VECTERAI',
      description: 'Manage your restaurant with VECTERAI',
    };
  }

  // Fetch restaurant name for dynamic title
  const { data: restaurants } = await (supabase as any)
    .from('restaurants')
    .select('name')
    .eq('owner_id', user.id)
    .limit(1) as { data: { name: string }[] | null };

  const restaurantName = restaurants?.[0]?.name;

  return {
    title: restaurantName ? `${restaurantName} | VECTERAI` : 'Dashboard | VECTERAI',
    description: restaurantName
      ? `Manage ${restaurantName} with VECTERAI`
      : 'Manage your restaurant with VECTERAI',
  };
}

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

  try {
    // Get organization with plan info - use .limit(1) instead of .single()
    const { data: orgs, error } = await (supabase as any)
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
      .limit(1) as {
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
        }[] | null;
        error: Error | null;
      };

    // Handle query errors gracefully
    if (error || !orgs || orgs.length === 0) {
      console.warn('[getOrganizationUsage] Organization not found:', organizationId);
      return undefined;
    }

    const org = orgs[0];

    // Count restaurants in organization
    const { count: locationCount } = await (supabase as any)
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
  } catch (error) {
    // Gracefully handle any errors - return undefined instead of crashing
    console.error('[getOrganizationUsage] Error fetching organization:', error);
    return undefined;
  }
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

  const userId = user.id as string;

  // Fetch user profile - use .limit(1) instead of .single() to avoid throwing
  const { data: profiles } = await (supabase as any)
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .limit(1) as { data: Profile[] | null };

  // Safely get profile (may be null if trigger hasn't run yet)
  const profile = profiles?.[0] ?? null;

  // Fetch user's restaurant (if any) with organization_id
  // IMPORTANT: Use .limit(1) instead of .single() to avoid throwing on 0 results
  const { data: restaurants } = await (supabase as any)
    .from('restaurants')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true })
    .limit(1) as { data: (Restaurant & { organization_id?: string })[] | null };

  // Safely get first restaurant (may be null/undefined)
  const restaurant = restaurants?.[0] ?? null;

  // Get current path to check if we're on onboarding
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';
  const isOnboardingPath = pathname.startsWith('/onboarding');

  // Redirect to onboarding if user has no restaurant and not already on onboarding
  if (!restaurant && !isOnboardingPath) {
    redirect('/onboarding');
  }

  // Fetch organization usage for sidebar (with defensive optional chaining)
  const organizationUsage = restaurant?.organization_id
    ? await getOrganizationUsage(supabase, user?.id ?? '', restaurant.organization_id)
    : undefined;

  return (
    <RestaurantProvider
      user={user}
      profile={profile}
      restaurant={restaurant}
      organizationUsage={organizationUsage}
    >
      <div className="min-h-screen bg-deep-navy">
        {/* Stable sidebar - not part of page transitions */}
        <DashboardNav
          user={user}
          profile={profile}
          restaurant={restaurant}
          organizationUsage={organizationUsage}
        />
        {/* Content area with progress bar and transitions */}
        <DashboardShell>{children}</DashboardShell>
      </div>
    </RestaurantProvider>
  );
}
