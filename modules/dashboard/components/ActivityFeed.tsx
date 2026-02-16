'use client';

import { useEffect, useState, useCallback } from 'react';
import { CalendarCheck, ShoppingBag, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { Reservation, Order } from '@/lib/database.types';

interface ActivityFeedProps {
  restaurantId: string;
}

type ActivityType = 'reservation' | 'order';

interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  status: string;
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function ActivityIcon({ type }: { type: ActivityType }) {
  if (type === 'reservation') {
    return (
      <div className="w-10 h-10 rounded-full bg-electric-blue/20 flex items-center justify-center">
        <CalendarCheck className="w-5 h-5 text-electric-blue" />
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
      <ShoppingBag className="w-5 h-5 text-green-500" />
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'confirmed':
    case 'completed':
      return 'text-green-400';
    case 'pending':
      return 'text-yellow-400';
    case 'cancelled':
    case 'no_show':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
}

/**
 * Real-time activity feed showing new reservations and orders.
 */
export function ActivityFeed({ restaurantId }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const addActivity = useCallback((activity: Activity) => {
    setActivities((prev) => {
      // Avoid duplicates
      if (prev.some((a) => a.id === activity.id)) return prev;
      // Keep only last 20 activities
      return [activity, ...prev].slice(0, 20);
    });
  }, []);

  const reservationToActivity = useCallback((reservation: Reservation): Activity => ({
    id: `reservation-${reservation.id}`,
    type: 'reservation',
    title: 'New Reservation',
    description: `${reservation.customer_name} - Party of ${reservation.party_size} for ${reservation.date} at ${reservation.time}`,
    timestamp: reservation.created_at,
    status: reservation.status,
  }), []);

  const orderToActivity = useCallback((order: Order): Activity => ({
    id: `order-${order.id}`,
    type: 'order',
    title: 'New Order',
    description: `${order.customer_name} - ${order.type.replace('_', ' ')} order ($${order.total.toFixed(2)})`,
    timestamp: order.created_at,
    status: order.status,
  }), []);

  useEffect(() => {
    const supabase = createClient();

    async function fetchInitialData() {
      try {
        // Fetch recent reservations and orders
        const [reservationsResult, ordersResult] = await Promise.all([
          supabase
            .from('reservations')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('created_at', { ascending: false })
            .limit(10),
          supabase
            .from('orders')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('created_at', { ascending: false })
            .limit(10),
        ]);

        const reservations = (reservationsResult.data || []) as Reservation[];
        const orders = (ordersResult.data || []) as Order[];
        const reservationActivities = reservations.map(reservationToActivity);
        const orderActivities = orders.map(orderToActivity);

        // Combine and sort by timestamp
        const combined = [...reservationActivities, ...orderActivities]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 20);

        setActivities(combined);
      } catch (error) {
        console.error('Failed to fetch initial activity data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchInitialData();

    // Set up real-time subscriptions
    const channel = supabase
      .channel('dashboard-activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reservations',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const reservation = payload.new as Reservation;
          addActivity(reservationToActivity(reservation));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const order = payload.new as Order;
          addActivity(orderToActivity(order));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reservations',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const reservation = payload.new as Reservation;
          setActivities((prev) =>
            prev.map((a) =>
              a.id === `reservation-${reservation.id}`
                ? reservationToActivity(reservation)
                : a
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const order = payload.new as Order;
          setActivities((prev) =>
            prev.map((a) =>
              a.id === `order-${order.id}`
                ? orderToActivity(order)
                : a
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, addActivity, reservationToActivity, orderToActivity]);

  if (loading) {
    return (
      <div className="bg-card border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-white/10" />
              <div className="flex-1">
                <div className="h-4 bg-white/10 rounded w-1/4 mb-2" />
                <div className="h-3 bg-white/10 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Live
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-gray-500" />
          </div>
          <p className="text-gray-400">No recent activity</p>
          <p className="text-sm text-gray-500 mt-1">
            New reservations and orders will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className={cn(
                'flex items-start gap-4 p-3 rounded-lg transition-colors',
                'hover:bg-white/5'
              )}
            >
              <ActivityIcon type={activity.type} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-white">{activity.title}</p>
                  <span className={cn('text-xs font-medium capitalize', getStatusColor(activity.status))}>
                    {activity.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-400 truncate">{activity.description}</p>
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  {formatTimeAgo(activity.timestamp)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
