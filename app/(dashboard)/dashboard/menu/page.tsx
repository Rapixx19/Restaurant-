import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MenuPageClient } from './MenuPageClient';
import type { Restaurant, MenuCategory, MenuItem } from '@/lib/database.types';

export const metadata = {
  title: 'Menu Management | VECTERAI',
  description: 'Manage your restaurant menu',
};

export default async function MenuPage() {
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

  // Fetch categories
  const { data: categories } = await (supabase as any)
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .order('sort_order', { ascending: true }) as { data: MenuCategory[] | null };

  // Fetch menu items
  const { data: items } = await (supabase as any)
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .order('sort_order', { ascending: true }) as { data: MenuItem[] | null };

  return (
    <MenuPageClient
      restaurant={restaurant}
      userId={user.id}
      initialCategories={categories || []}
      initialItems={items || []}
    />
  );
}
