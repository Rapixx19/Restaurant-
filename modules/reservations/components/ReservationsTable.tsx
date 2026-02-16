'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  Users,
  Clock,
  Phone,
  Mail,
  MoreVertical,
  CheckCircle,
  XCircle,
  UserCheck,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface Reservation {
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
}

interface ReservationsTableProps {
  restaurantId: string;
  initialReservations: Reservation[];
}

const STATUS_CONFIG: Record<
  Reservation['status'],
  { label: string; color: string; bgColor: string; icon: typeof CheckCircle }
> = {
  pending: {
    label: 'Pending',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    icon: AlertCircle,
  },
  confirmed: {
    label: 'Confirmed',
    color: 'text-electric-blue',
    bgColor: 'bg-electric-blue/10',
    icon: CheckCircle,
  },
  seated: {
    label: 'Seated',
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
    icon: UserCheck,
  },
  completed: {
    label: 'Completed',
    color: 'text-gray-400',
    bgColor: 'bg-gray-400/10',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
    icon: XCircle,
  },
  no_show: {
    label: 'No Show',
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
    icon: XCircle,
  },
};

const SOURCE_LABELS: Record<Reservation['source'], string> = {
  phone: 'Phone',
  chat: 'Chat',
  website: 'Website',
  walk_in: 'Walk-in',
  manual: 'Manual',
  ai: 'AI Assistant',
};

export function ReservationsTable({
  restaurantId,
  initialReservations,
}: ReservationsTableProps) {
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [statusFilter, setStatusFilter] = useState<Reservation['status'] | 'all'>('all');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const supabase = createClient();

  // Fetch reservations for the selected date
  const fetchReservations = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('reservation_date', selectedDate)
      .order('reservation_time', { ascending: true });

    if (error) {
      console.error('Error fetching reservations:', error);
      toast.error('Failed to load reservations');
    } else {
      setReservations((data as Reservation[]) || []);
    }
    setIsLoading(false);
  }, [restaurantId, selectedDate, supabase]);

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('reservations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newReservation = payload.new as Reservation;
            // Only add if it's for the selected date
            if (newReservation.reservation_date === selectedDate) {
              setReservations((prev) => {
                // Sort by time
                const updated = [...prev, newReservation].sort((a, b) =>
                  a.reservation_time.localeCompare(b.reservation_time)
                );
                return updated;
              });
              toast.success(`New reservation: ${newReservation.customer_name}`, {
                description: `Party of ${newReservation.party_size} at ${formatTime(newReservation.reservation_time)}`,
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Reservation;
            setReservations((prev) =>
              prev.map((r) => (r.id === updated.id ? updated : r))
            );
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string };
            setReservations((prev) => prev.filter((r) => r.id !== deleted.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, selectedDate, supabase]);

  // Fetch when date changes
  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  // Update reservation status
  const updateStatus = async (id: string, status: Reservation['status']) => {
    const { error } = await supabase
      .from('reservations')
      .update({ status })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
      console.error('Error updating status:', error);
    } else {
      toast.success(`Status updated to ${STATUS_CONFIG[status].label}`);
    }
    setActiveDropdown(null);
  };

  // Format time for display (24h to 12h)
  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Filter reservations
  const filteredReservations = reservations.filter((r) =>
    statusFilter === 'all' ? true : r.status === statusFilter
  );

  // Group by time slots
  const timeSlots = filteredReservations.reduce(
    (acc, reservation) => {
      const hour = reservation.reservation_time.split(':')[0];
      const slot = `${hour}:00`;
      if (!acc[slot]) acc[slot] = [];
      acc[slot].push(reservation);
      return acc;
    },
    {} as Record<string, Reservation[]>
  );

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-electric-blue"
          />
          <button
            onClick={fetchReservations}
            disabled={isLoading}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
          >
            <RefreshCw className={cn('w-5 h-5', isLoading && 'animate-spin')} />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'pending', 'confirmed', 'seated', 'completed'] as const).map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  statusFilter === status
                    ? 'bg-electric-blue text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                )}
              >
                {status === 'all' ? 'All' : STATUS_CONFIG[status].label}
              </button>
            )
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-white/10 rounded-xl p-4">
          <p className="text-sm text-gray-400">Total</p>
          <p className="text-2xl font-bold text-white">{reservations.length}</p>
        </div>
        <div className="bg-card border border-white/10 rounded-xl p-4">
          <p className="text-sm text-gray-400">Confirmed</p>
          <p className="text-2xl font-bold text-electric-blue">
            {reservations.filter((r) => r.status === 'confirmed').length}
          </p>
        </div>
        <div className="bg-card border border-white/10 rounded-xl p-4">
          <p className="text-sm text-gray-400">Seated</p>
          <p className="text-2xl font-bold text-green-400">
            {reservations.filter((r) => r.status === 'seated').length}
          </p>
        </div>
        <div className="bg-card border border-white/10 rounded-xl p-4">
          <p className="text-sm text-gray-400">Total Guests</p>
          <p className="text-2xl font-bold text-white">
            {reservations
              .filter((r) => ['confirmed', 'seated'].includes(r.status))
              .reduce((sum, r) => sum + r.party_size, 0)}
          </p>
        </div>
      </div>

      {/* Reservations List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-electric-blue" />
        </div>
      ) : filteredReservations.length === 0 ? (
        <div className="bg-card border border-white/10 rounded-xl p-12 text-center">
          <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No reservations</h3>
          <p className="text-gray-400">
            {statusFilter === 'all'
              ? 'No reservations for this date yet.'
              : `No ${STATUS_CONFIG[statusFilter].label.toLowerCase()} reservations.`}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(timeSlots)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([slot, slotReservations]) => (
              <div key={slot}>
                <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {formatTime(slot)} - {formatTime(`${parseInt(slot) + 1}:00`)}
                </h3>
                <div className="grid gap-3">
                  {slotReservations.map((reservation) => {
                    const statusConfig = STATUS_CONFIG[reservation.status];
                    const StatusIcon = statusConfig.icon;

                    return (
                      <div
                        key={reservation.id}
                        className="bg-card border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-white font-medium truncate">
                                {reservation.customer_name}
                              </h4>
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                                  statusConfig.bgColor,
                                  statusConfig.color
                                )}
                              >
                                <StatusIcon className="w-3 h-3" />
                                {statusConfig.label}
                              </span>
                              {reservation.source === 'ai' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400">
                                  AI Booked
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {formatTime(reservation.reservation_time)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {reservation.party_size}{' '}
                                {reservation.party_size === 1 ? 'guest' : 'guests'}
                              </span>
                              <a
                                href={`tel:${reservation.customer_phone}`}
                                className="flex items-center gap-1 hover:text-white transition-colors"
                              >
                                <Phone className="w-4 h-4" />
                                {reservation.customer_phone}
                              </a>
                              {reservation.customer_email && (
                                <a
                                  href={`mailto:${reservation.customer_email}`}
                                  className="flex items-center gap-1 hover:text-white transition-colors"
                                >
                                  <Mail className="w-4 h-4" />
                                  {reservation.customer_email}
                                </a>
                              )}
                            </div>

                            {reservation.special_requests && (
                              <p className="mt-2 text-sm text-gray-500 italic">
                                &quot;{reservation.special_requests}&quot;
                              </p>
                            )}
                          </div>

                          {/* Actions Dropdown */}
                          <div className="relative">
                            <button
                              onClick={() =>
                                setActiveDropdown(
                                  activeDropdown === reservation.id
                                    ? null
                                    : reservation.id
                                )
                              }
                              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>

                            {activeDropdown === reservation.id && (
                              <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-white/10 rounded-lg shadow-xl z-10 overflow-hidden">
                                {reservation.status === 'pending' && (
                                  <button
                                    onClick={() =>
                                      updateStatus(reservation.id, 'confirmed')
                                    }
                                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/5 flex items-center gap-2"
                                  >
                                    <CheckCircle className="w-4 h-4 text-electric-blue" />
                                    Confirm
                                  </button>
                                )}
                                {['pending', 'confirmed'].includes(
                                  reservation.status
                                ) && (
                                  <button
                                    onClick={() =>
                                      updateStatus(reservation.id, 'seated')
                                    }
                                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/5 flex items-center gap-2"
                                  >
                                    <UserCheck className="w-4 h-4 text-green-400" />
                                    Mark Seated
                                  </button>
                                )}
                                {reservation.status === 'seated' && (
                                  <button
                                    onClick={() =>
                                      updateStatus(reservation.id, 'completed')
                                    }
                                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/5 flex items-center gap-2"
                                  >
                                    <CheckCircle className="w-4 h-4 text-gray-400" />
                                    Complete
                                  </button>
                                )}
                                {!['completed', 'cancelled', 'no_show'].includes(
                                  reservation.status
                                ) && (
                                  <>
                                    <button
                                      onClick={() =>
                                        updateStatus(reservation.id, 'no_show')
                                      }
                                      className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/5 flex items-center gap-2"
                                    >
                                      <AlertCircle className="w-4 h-4 text-yellow-400" />
                                      No Show
                                    </button>
                                    <button
                                      onClick={() =>
                                        updateStatus(reservation.id, 'cancelled')
                                      }
                                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                                    >
                                      <XCircle className="w-4 h-4" />
                                      Cancel
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
