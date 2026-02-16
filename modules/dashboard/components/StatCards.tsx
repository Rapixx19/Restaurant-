'use client';

import { useEffect, useState } from 'react';
import { CalendarCheck, ShoppingBag, Users, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

interface StatCardsProps {
  restaurantId: string;
}

interface Stats {
  reservationsToday: number;
  ordersToday: number;
  newCustomersWeek: number;
  activeConversations: number;
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  loading?: boolean;
}

function StatCard({ label, value, icon: Icon, color, loading }: StatCardProps) {
  return (
    <div className="bg-card border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          {loading ? (
            <div className="h-9 w-16 bg-white/10 rounded animate-pulse mt-2" />
          ) : (
            <p className="mt-2 text-3xl font-bold text-white">
              {value.toLocaleString()}
            </p>
          )}
        </div>
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', color)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

/**
 * Grid of stat cards showing live dashboard metrics.
 */
export function StatCards({ restaurantId }: StatCardsProps) {
  const [stats, setStats] = useState<Stats>({
    reservationsToday: 0,
    ordersToday: 0,
    newCustomersWeek: 0,
    activeConversations: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const supabase = createClient();

        // Get today's date range
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

        // Get this week's start (Monday)
        const dayOfWeek = now.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday).toISOString();

        // Fetch all stats in parallel
        const [
          reservationsResult,
          ordersResult,
          customersResult,
          conversationsResult,
        ] = await Promise.all([
          // Reservations today
          supabase
            .from('reservations')
            .select('id', { count: 'exact', head: true })
            .eq('restaurant_id', restaurantId)
            .gte('date', todayStart.split('T')[0])
            .lt('date', todayEnd.split('T')[0]),

          // Orders today
          supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('restaurant_id', restaurantId)
            .gte('created_at', todayStart)
            .lt('created_at', todayEnd),

          // New customers this week
          supabase
            .from('customers')
            .select('id', { count: 'exact', head: true })
            .eq('restaurant_id', restaurantId)
            .gte('created_at', weekStart),

          // Active chat sessions
          supabase
            .from('chat_sessions')
            .select('id', { count: 'exact', head: true })
            .eq('restaurant_id', restaurantId)
            .eq('status', 'active'),
        ]);

        setStats({
          reservationsToday: reservationsResult.count || 0,
          ordersToday: ordersResult.count || 0,
          newCustomersWeek: customersResult.count || 0,
          activeConversations: conversationsResult.count || 0,
        });
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [restaurantId]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        label="Reservations Today"
        value={stats.reservationsToday}
        icon={CalendarCheck}
        color="bg-electric-blue"
        loading={loading}
      />
      <StatCard
        label="Orders Today"
        value={stats.ordersToday}
        icon={ShoppingBag}
        color="bg-green-500"
        loading={loading}
      />
      <StatCard
        label="New Customers (Week)"
        value={stats.newCustomersWeek}
        icon={Users}
        color="bg-purple-500"
        loading={loading}
      />
      <StatCard
        label="Active Conversations"
        value={stats.activeConversations}
        icon={MessageCircle}
        color="bg-orange-500"
        loading={loading}
      />
    </div>
  );
}
