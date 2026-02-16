import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { UsageBanner, StatCards, ActivityFeed } from '@/modules/dashboard';
import type { Profile, Restaurant } from '@/lib/database.types';
import { Plus, UtensilsCrossed, MessageCircle, Settings } from 'lucide-react';

export const metadata = {
  title: 'Dashboard | VECTERAI',
  description: 'Your VECTERAI dashboard',
};

/**
 * Main dashboard page.
 * Shows overview of restaurant operations with live data.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null };

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', user.id)
    .single() as { data: Restaurant | null };

  if (!restaurant) {
    redirect('/onboarding');
  }

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

      {/* Usage Banner */}
      <UsageBanner restaurant={restaurant} />

      {/* Stats Grid */}
      <StatCards restaurantId={restaurant.id} />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed - Takes 2 columns */}
        <div className="lg:col-span-2">
          <ActivityFeed restaurantId={restaurant.id} />
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
