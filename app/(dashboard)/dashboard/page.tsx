import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { UsageBanner, StatCards, ActivityFeed, OnboardingStatusBanner } from '@/modules/dashboard';
import type { Profile, Restaurant } from '@/lib/database.types';
import { Plus, UtensilsCrossed, MessageCircle, Settings, MapPin, Building2, ArrowRight } from 'lucide-react';
import { getOrganizationLimits } from '@/lib/limits';

export const metadata = {
  title: 'Dashboard | VECTERAI',
  description: 'Your VECTERAI dashboard',
};

/**
 * Location Selector Component
 * Shows when user has multiple restaurants
 */
function LocationSelector({
  restaurants,
  profile,
  planName,
  canAddMore,
}: {
  restaurants: Restaurant[];
  profile: Profile | null;
  planName: string;
  canAddMore: boolean;
}) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}
        </h1>
        <p className="mt-2 text-gray-400">
          Select a location to manage
        </p>
      </div>

      {/* Plan Badge */}
      <div className="flex items-center gap-2">
        <span className="px-3 py-1 text-sm font-medium bg-electric-blue/20 text-electric-blue rounded-full capitalize">
          {planName} Plan
        </span>
        <span className="text-sm text-gray-400">
          {restaurants.length} location{restaurants.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Location Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {restaurants?.map((restaurant) => (
          <Link
            key={restaurant?.id ?? Math.random().toString()}
            href={`/dashboard/${restaurant?.slug ?? restaurant?.id ?? ''}`}
            className="group p-6 bg-card border border-white/10 rounded-xl hover:border-electric-blue/50 hover:bg-electric-blue/5 transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-electric-blue/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-electric-blue" />
              </div>
              <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-electric-blue group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">{restaurant?.name ?? 'Restaurant'}</h3>
            {restaurant?.address && (
              <p className="text-sm text-gray-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {(restaurant?.address as { city?: string })?.city ?? 'Location'}
              </p>
            )}
          </Link>
        ))}

        {/* Add Location Card */}
        {canAddMore && (
          <Link
            href="/onboarding?add=true"
            className="group p-6 border-2 border-dashed border-white/20 rounded-xl hover:border-electric-blue/50 hover:bg-electric-blue/5 transition-all duration-200 flex flex-col items-center justify-center text-center min-h-[160px]"
          >
            <div className="w-12 h-12 rounded-xl bg-white/5 group-hover:bg-electric-blue/10 flex items-center justify-center mb-3 transition-colors">
              <Plus className="w-6 h-6 text-gray-400 group-hover:text-electric-blue transition-colors" />
            </div>
            <p className="font-medium text-gray-400 group-hover:text-white transition-colors">
              Add Location
            </p>
          </Link>
        )}

        {/* Upgrade Card (if can't add more) */}
        {!canAddMore && (
          <Link
            href="/dashboard/settings/billing"
            className="group p-6 border-2 border-dashed border-amber-500/30 rounded-xl hover:border-amber-500/50 hover:bg-amber-500/5 transition-all duration-200 flex flex-col items-center justify-center text-center min-h-[160px]"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3">
              <Plus className="w-6 h-6 text-amber-400" />
            </div>
            <p className="font-medium text-amber-400">
              Upgrade to Add More
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Your plan limit reached
            </p>
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * Main dashboard page.
 * Shows overview of restaurant operations with live data.
 *
 * SINGLE-LOCATION FLOW: If only 1 restaurant, skip selector.
 * MULTI-LOCATION FLOW: If >1 restaurants, show location picker.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userId = user.id as string;

  // Use .limit(1) instead of .single() to avoid throwing on 0 results
  const { data: profiles } = await (supabase as any)
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .limit(1) as { data: Profile[] | null };

  // Safely get profile (may be null if trigger hasn't run yet)
  const profile = profiles?.[0] ?? null;

  // Fetch ALL restaurants for this user
  const { data: restaurants } = await (supabase as any)
    .from('restaurants')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true }) as { data: Restaurant[] | null };

  if (!restaurants || restaurants.length === 0) {
    redirect('/onboarding');
  }

  // MULTI-LOCATION: Show location selector
  if (restaurants.length > 1) {
    // Get organization limits - with defensive access
    const firstRestaurant = restaurants?.[0];
    let planName = 'free';
    let canAddMore = false;

    // Check for organization_id in extended restaurant data (defensive)
    const orgId = (firstRestaurant as Restaurant & { organization_id?: string })?.organization_id;
    if (orgId) {
      const limits = await getOrganizationLimits(orgId);
      if (limits) {
        planName = limits?.planName ?? 'free';
        canAddMore = (limits?.currentLocations ?? 0) < (limits?.locationLimit ?? 1);
      }
    }

    return (
      <LocationSelector
        restaurants={restaurants}
        profile={profile}
        planName={planName}
        canAddMore={canAddMore}
      />
    );
  }

  // SINGLE-LOCATION: Show regular dashboard
  // Defensive: ensure restaurant exists before accessing
  const restaurant = restaurants?.[0];

  // Double-check restaurant exists (belt and suspenders)
  if (!restaurant) {
    redirect('/onboarding');
  }

  // Defensive: safely access status with fallback for new/pending users
  const restaurantStatus = (restaurant as Restaurant & { status?: string })?.status ?? 'pending';

  // Defensive: safely access nested settings with optional chaining
  const settings = (restaurant?.settings ?? null) as { voice?: { vapiPhoneNumberId?: string } } | null;
  const twilioNumber = settings?.voice?.vapiPhoneNumberId ?? null;

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}
          </h1>
          <p className="mt-2 text-gray-400">
            Here&apos;s what&apos;s happening with your restaurant today.
          </p>
        </div>
      </div>

      {/* Onboarding Status Banner */}
      <OnboardingStatusBanner
        status={restaurantStatus as 'pending' | 'reviewing' | 'info_requested' | 'active' | 'suspended'}
        twilioNumber={twilioNumber}
      />

      {/* Usage Banner - uses RestaurantContext */}
      <UsageBanner />

      {/* Stats Grid - uses RestaurantContext */}
      <StatCards />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed - uses RestaurantContext */}
        <div className="lg:col-span-2">
          <ActivityFeed />
        </div>

        {/* Quick Actions - Takes 1 column */}
        <div className="bg-card border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              href="/dashboard/reservations/new"
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-electric-blue/10 hover:bg-electric-blue/20 border border-electric-blue/20 text-electric-blue font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Reservation
            </Link>
            <Link
              href="/dashboard/menu"
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-colors"
            >
              <UtensilsCrossed className="w-5 h-5" />
              Manage Menu
            </Link>
            <Link
              href="/dashboard/conversations"
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              View Conversations
            </Link>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-colors"
            >
              <Settings className="w-5 h-5" />
              Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
