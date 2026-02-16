import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ReservationsTable } from '@/modules/reservations';
import { CalendarDays } from 'lucide-react';
import type { Restaurant, Reservation } from '@/lib/database.types';

export const metadata = {
  title: 'Reservations | VECTERAI',
  description: 'Manage your restaurant reservations',
};

export default async function ReservationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: restaurant } = (await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', user.id)
    .single()) as { data: Restaurant | null };

  if (!restaurant) {
    redirect('/onboarding');
  }

  // Fetch today's reservations for initial load
  const today = new Date().toISOString().split('T')[0];
  const { data: initialReservations } = (await supabase
    .from('reservations')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .eq('reservation_date', today)
    .order('reservation_time', { ascending: true })) as { data: Reservation[] | null };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-electric-blue/10 flex items-center justify-center">
          <CalendarDays className="w-6 h-6 text-electric-blue" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Reservations</h1>
          <p className="text-gray-400">
            Manage bookings and track guest arrivals
          </p>
        </div>
      </div>

      {/* Reservations Table with Realtime */}
      <ReservationsTable
        restaurantId={restaurant.id}
        initialReservations={initialReservations || []}
      />
    </div>
  );
}
