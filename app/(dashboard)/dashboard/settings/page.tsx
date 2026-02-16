import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SettingsTabs } from '@/modules/settings';
import type { Restaurant } from '@/lib/database.types';

export const metadata = {
  title: 'Settings | VECTERAI',
  description: 'Manage your restaurant settings',
};

/**
 * Settings page with tabs for Info, AI Config, and Capacity.
 */
export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user's restaurant
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', user.id)
    .single() as { data: Restaurant | null };

  if (!restaurant) {
    redirect('/onboarding');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">
          Manage your restaurant settings and AI configuration
        </p>
      </div>

      <SettingsTabs restaurant={restaurant} userId={user.id} />
    </div>
  );
}
