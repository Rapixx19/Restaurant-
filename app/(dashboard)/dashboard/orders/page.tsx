import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OrdersDisplay } from './OrdersDisplay';
import { ShoppingBag } from 'lucide-react';
import type { Restaurant, Order } from '@/lib/database.types';

export const metadata = {
  title: 'Orders | VECTERAI',
  description: 'Kitchen Display System - Manage incoming orders',
};

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  // Fetch active orders (paid but not completed)
  const { data: initialOrders } = (await (supabase as any)
    .from('orders')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .in('status', ['confirmed', 'preparing', 'ready'])
    .order('created_at', { ascending: true })) as { data: Order[] | null };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <ShoppingBag className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Kitchen Display</h1>
          <p className="text-gray-400">
            Real-time order management
          </p>
        </div>
      </div>

      <OrdersDisplay
        initialOrders={initialOrders || []}
      />
    </div>
  );
}
