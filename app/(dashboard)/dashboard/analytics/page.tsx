import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getFullAnalytics } from '@/lib/analytics';
import {
  StatCard,
  RevenueLineChart,
  BookingBarChart,
  SentimentCard,
  TopItemsList,
  LanguageDistributionChart,
  MissedLanguageOpportunities,
} from '@/modules/analytics';
import type { Restaurant } from '@/lib/database.types';
import { DollarSign, Users, MessageSquare, Clock } from 'lucide-react';

export const metadata = {
  title: 'Analytics | VECTERAI',
  description: 'Business insights and analytics for your restaurant',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', user.id)
    .single() as { data: Restaurant | null };

  if (!restaurant) {
    redirect('/onboarding');
  }

  // Fetch all analytics data
  const analytics = await getFullAnalytics(restaurant.id, 30);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <p className="mt-2 text-gray-400">
          Business insights and performance metrics for the last 30 days
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(analytics.stats.totalRevenue)}
          change={analytics.stats.revenueChange}
          changeLabel="vs last 30 days"
          icon={<DollarSign className="w-6 h-6 text-green-500" />}
        />
        <StatCard
          title="Total Guests"
          value={analytics.stats.totalGuests.toLocaleString()}
          change={analytics.stats.guestsChange}
          changeLabel="vs last 30 days"
          icon={<Users className="w-6 h-6 text-blue-500" />}
        />
        <StatCard
          title="AI Conversations"
          value={analytics.stats.aiConversations.toLocaleString()}
          icon={<MessageSquare className="w-6 h-6 text-purple-500" />}
        />
        <StatCard
          title="Time Saved"
          value={formatDuration(analytics.stats.timeSavedMinutes)}
          icon={<Clock className="w-6 h-6 text-orange-500" />}
        />
      </div>

      {/* Revenue Chart */}
      <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Revenue Trend</h3>
        <RevenueLineChart data={analytics.revenue.revenueByDay} />
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bookings by Day */}
        <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Reservations by Day</h3>
          <BookingBarChart data={analytics.reservations.byDayOfWeek} />
        </div>

        {/* Top Menu Items */}
        <TopItemsList items={analytics.menu.topItems} />

        {/* Sentiment Card */}
        <SentimentCard
          sentiment={analytics.voice.sentiment}
          totalCalls={analytics.voice.totalCalls}
        />
      </div>

      {/* Additional Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-4">
          <p className="text-sm text-gray-400">Avg. Order Value</p>
          <p className="text-2xl font-bold text-white mt-1">
            {formatCurrency(analytics.revenue.averageOrderValue)}
          </p>
        </div>
        <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-4">
          <p className="text-sm text-gray-400">Avg. Party Size</p>
          <p className="text-2xl font-bold text-white mt-1">
            {analytics.reservations.averagePartySize.toFixed(1)} guests
          </p>
        </div>
        <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-4">
          <p className="text-sm text-gray-400">Voice Conversion Rate</p>
          <p className="text-2xl font-bold text-white mt-1">
            {analytics.voice.conversionRate.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-4">
          <p className="text-sm text-gray-400">Upcoming Reservations</p>
          <p className="text-2xl font-bold text-white mt-1">
            {analytics.reservations.upcomingReservations}
          </p>
        </div>
      </div>

      {/* Reservation Source Breakdown */}
      <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Reservations by Source</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {Object.entries(analytics.reservations.bySource).map(([source, count]) => (
            <div key={source} className="text-center">
              <p className="text-2xl font-bold text-white">{count}</p>
              <p className="text-sm text-gray-400 capitalize">
                {source === 'ai' ? 'AI Chat' : source === 'walkIn' ? 'Walk-in' : source}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Language Insights Section */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Multilingual Insights</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Language Distribution Donut Chart */}
          <LanguageDistributionChart data={analytics.language.distribution} />

          {/* Missed Language Opportunities */}
          <MissedLanguageOpportunities
            opportunities={analytics.language.opportunities}
            supportedLanguages={analytics.language.supportedLanguages}
          />
        </div>
      </div>
    </div>
  );
}
