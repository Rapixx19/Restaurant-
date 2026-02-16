import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ReservationsTable } from '@/modules/reservations';
import { Plus, CalendarDays } from 'lucide-react';
import type { Restaurant } from '@/lib/database.types';

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
    .order('reservation_time', { ascending: true })) as {
    data: Array<{
      id: string;
      customer_name: string;
      customer_phone: string;
      customer_email: string | null;
      party_size: number;
      reservation_date: string;
      reservation_time: string;
      status: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
      source: 'phone' | 'chat' | 'website' | 'walk_in' | 'manual' | 'ai';
      special_requests: string | null;
      table_assignment: string | null;
      created_at: string;
    }> | null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

        <Link
          href="/dashboard/reservations/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-electric-blue hover:bg-electric-blue-600 text-white font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Reservation
        </Link>
      </div>

      {/* Reservations Table with Realtime */}
      <ReservationsTable
        restaurantId={restaurant.id}
        initialReservations={initialReservations || []}
      />
    </div>
  );
}
