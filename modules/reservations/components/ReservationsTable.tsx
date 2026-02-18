'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRestaurant } from '@/lib/context';
import type { Reservation } from '@/lib/database.types';
import { ReservationCard } from './ReservationCard';
import { ReservationFilters } from './ReservationFilters';
import { NewReservationModal, type NewReservationData } from './NewReservationModal';
import type { ReservationStatus } from '../types';

interface ReservationsTableProps {
  initialReservations: Reservation[];
}

/**
 * ReservationsTable - uses RestaurantContext for restaurantId.
 */
export function ReservationsTable({ initialReservations }: ReservationsTableProps) {
  const { restaurantId } = useRestaurant();
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>(initialReservations);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);

  // Filter state
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = (today.getMonth() + 1).toString().padStart(2, '0');
    const d = today.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [selectedStatus, setSelectedStatus] = useState<ReservationStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const supabase = createClient();

  // Capture non-null reference for callbacks (TypeScript narrowing)
  const restId = restaurantId ?? '';

  // Fetch reservations for selected date
  const fetchReservations = useCallback(async (date: string) => {
    if (!restId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('restaurant_id', restId)
        .eq('reservation_date', date)
        .order('reservation_time', { ascending: true });

      if (error) throw error;
      setReservations((data || []) as Reservation[]);
    } catch (err) {
      console.error('Error fetching reservations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [restId, supabase]);

  // Apply filters
  useEffect(() => {
    let filtered = [...reservations];

    if (selectedStatus !== 'all') {
      filtered = filtered.filter((r) => r.status === selectedStatus);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.customer_name.toLowerCase().includes(query) ||
          r.customer_phone.includes(query)
      );
    }

    setFilteredReservations(filtered);
  }, [reservations, selectedStatus, searchQuery]);

  // Fetch when date changes
  useEffect(() => {
    fetchReservations(selectedDate);
  }, [selectedDate, fetchReservations]);

  // Set up Supabase Realtime subscription
  useEffect(() => {
    if (!restId) return;
    const channel = supabase
      .channel(`reservations:${restId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: `restaurant_id=eq.${restId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newReservation = payload.new as Reservation;
            if (newReservation.reservation_date === selectedDate) {
              setReservations((prev) => {
                const updated = [...prev, newReservation];
                return updated.sort((a, b) => a.reservation_time.localeCompare(b.reservation_time));
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedReservation = payload.new as Reservation;
            setReservations((prev) =>
              prev.map((r) => (r.id === updatedReservation.id ? updatedReservation : r))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id?: string })?.id;
            if (deletedId) {
              setReservations((prev) => prev.filter((r) => r.id !== deletedId));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restId, selectedDate, supabase]);

  const handleStatusChange = async (id: string, newStatus: ReservationStatus) => {
    const { error } = await supabase
      .from('reservations')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error updating reservation:', error);
      throw error;
    }

    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
  };

  const handleCreateReservation = async (data: NewReservationData): Promise<{ success: boolean; error?: string }> => {
    if (!restId) return { success: false, error: 'Restaurant not found' };
    try {
      const { error } = await supabase.from('reservations').insert({
        restaurant_id: restId,
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        customer_email: data.customerEmail || null,
        party_size: data.partySize,
        reservation_date: data.date,
        reservation_time: data.time,
        source: data.source,
        special_requests: data.specialRequests || null,
        status: 'confirmed',
        duration_minutes: 90,
      });

      if (error) {
        console.error('Error creating reservation:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error('Error creating reservation:', err);
      return { success: false, error: 'Failed to create reservation' };
    }
  };

  const groupedByTime = filteredReservations.reduce((acc, reservation) => {
    const hour = reservation.reservation_time.split(':')[0];
    if (!acc[hour]) {
      acc[hour] = [];
    }
    acc[hour].push(reservation);
    return acc;
  }, {} as Record<string, Reservation[]>);

  const sortedHours = Object.keys(groupedByTime).sort();

  const formatHour = (hour: string): string => {
    const h = parseInt(hour, 10);
    if (h === 0) return '12:00 AM';
    if (h < 12) return `${h}:00 AM`;
    if (h === 12) return '12:00 PM';
    return `${h - 12}:00 PM`;
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <ReservationFilters
          selectedDate={selectedDate}
          selectedStatus={selectedStatus}
          searchQuery={searchQuery}
          onDateChange={setSelectedDate}
          onStatusChange={setSelectedStatus}
          onSearchChange={setSearchQuery}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-400">
          {filteredReservations.length} reservation{filteredReservations.length !== 1 ? 's' : ''} found
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          + New Reservation
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-slate-400">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading reservations...
          </div>
        </div>
      ) : filteredReservations.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/30 border border-slate-700 rounded-lg">
          <div className="text-slate-400 mb-2">No reservations found</div>
          <p className="text-sm text-slate-500">
            {searchQuery || selectedStatus !== 'all'
              ? 'Try adjusting your filters'
              : 'Create a new reservation to get started'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedHours.map((hour) => (
            <div key={hour}>
              <div className="flex items-center gap-2 mb-3">
                <div className="text-sm font-medium text-slate-300">{formatHour(hour)}</div>
                <div className="flex-1 h-px bg-slate-700" />
                <div className="text-xs text-slate-500">
                  {groupedByTime[hour].length} reservation{groupedByTime[hour].length !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="space-y-2">
                {groupedByTime[hour].map((reservation) => (
                  <ReservationCard
                    key={reservation.id}
                    reservation={reservation}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <NewReservationModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSubmit={handleCreateReservation}
        selectedDate={selectedDate}
      />
    </div>
  );
}
