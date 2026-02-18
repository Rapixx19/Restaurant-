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

  const userId = user.id as string;

  // Use limit(1) instead of single() to avoid throwing on 0 results

  const { data: restaurants } = (await (supabase as any)
    .from('restaurants')
    .select('*')
    .eq('owner_id', userId)
    .limit(1)) as { data: Restaurant[] | null };

  const restaurant = (restaurants?.[0] ?? null) as Restaurant | null;
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
