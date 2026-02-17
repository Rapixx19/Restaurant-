'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { getPricingTier, type PricingTier } from '@/modules/landing/constants/pricing';
import type { Restaurant } from '@/lib/database.types';
import type { RestaurantSettings, TierId } from '@/modules/settings/types';

interface UsageBannerProps {
  restaurant: Restaurant;
}

interface UsageData {
  chatMessages: number;
  reservations: number;
}

/**
 * Displays current tier usage with progress bars and upgrade CTA.
 */
export function UsageBanner({ restaurant }: UsageBannerProps) {
  const [usage, setUsage] = useState<UsageData>({ chatMessages: 0, reservations: 0 });
  const [loading, setLoading] = useState(true);

  // Defensive: safely extract restaurant ID (hooks must be called unconditionally)
  const restaurantId = restaurant?.id ?? null;

  // Extract settings safely
  const settings = (restaurant?.settings ?? {}) as unknown as RestaurantSettings;
  const tierId: TierId = settings?.tier ?? 'free';
  const tier = getPricingTier(tierId) as PricingTier;

  useEffect(() => {
    // Skip fetch if no restaurant ID
    if (!restaurantId) {
      setLoading(false);
      return;
    }

    async function fetchUsage() {
      try {
        const supabase = createClient();
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        // Fetch chat messages this month
        const { count: messageCount } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', startOfMonth);

        // Fetch reservations this month
        const { count: reservationCount } = await supabase
          .from('reservations')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId)
          .gte('created_at', startOfMonth);

        setUsage({
          chatMessages: messageCount || 0,
          reservations: reservationCount || 0,
        });
      } catch (error) {
        console.error('Failed to fetch usage data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUsage();
  }, [restaurantId]);

  // Defensive: show skeleton if no restaurant
  if (!restaurant) {
    return (
      <div className="bg-card border border-white/10 rounded-xl p-6 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-1/4 mb-4" />
        <div className="h-2 bg-white/10 rounded w-full" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-card border border-white/10 rounded-xl p-6 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-1/4 mb-4" />
        <div className="h-2 bg-white/10 rounded w-full" />
      </div>
    );
  }

  const messageLimit = tier.limits.chatMessages;
  const reservationLimit = tier.limits.reservations;

  const messagePercentage = messageLimit === 'unlimited'
    ? 0
    : Math.min((usage.chatMessages / messageLimit) * 100, 100);

  const reservationPercentage = reservationLimit === 'unlimited'
    ? 0
    : Math.min((usage.reservations / reservationLimit) * 100, 100);

  const showUpgrade = messagePercentage > 80 || reservationPercentage > 80;
  const isNearLimit = messagePercentage > 90 || reservationPercentage > 90;

  return (
    <div className={cn(
      'border rounded-xl p-6 transition-colors',
      isNearLimit
        ? 'bg-red-500/10 border-red-500/20'
        : showUpgrade
          ? 'bg-yellow-500/10 border-yellow-500/20'
          : 'bg-card border-white/10'
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            isNearLimit
              ? 'bg-red-500/20'
              : showUpgrade
                ? 'bg-yellow-500/20'
                : 'bg-electric-blue/20'
          )}>
            <TrendingUp className={cn(
              'w-5 h-5',
              isNearLimit
                ? 'text-red-400'
                : showUpgrade
                  ? 'text-yellow-400'
                  : 'text-electric-blue'
            )} />
          </div>
          <div>
            <h3 className="font-semibold text-white">
              {tier.name} Plan Usage
            </h3>
            <p className="text-sm text-gray-400">
              Monthly usage for your subscription
            </p>
          </div>
        </div>

        {showUpgrade && tierId !== 'enterprise' && (
          <Link
            href="/dashboard/billing"
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
              isNearLimit
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-yellow-500 hover:bg-yellow-600 text-black'
            )}
          >
            <Zap className="w-4 h-4" />
            Upgrade Now
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chat Messages */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Chat Messages</span>
            <span className="text-white font-medium">
              {usage.chatMessages.toLocaleString()} / {messageLimit === 'unlimited' ? 'Unlimited' : messageLimit.toLocaleString()}
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                messagePercentage > 90
                  ? 'bg-red-500'
                  : messagePercentage > 80
                    ? 'bg-yellow-500'
                    : 'bg-electric-blue'
              )}
              style={{ width: messageLimit === 'unlimited' ? '0%' : `${messagePercentage}%` }}
            />
          </div>
        </div>

        {/* Reservations */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Reservations</span>
            <span className="text-white font-medium">
              {usage.reservations.toLocaleString()} / {reservationLimit === 'unlimited' ? 'Unlimited' : reservationLimit.toLocaleString()}
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                reservationPercentage > 90
                  ? 'bg-red-500'
                  : reservationPercentage > 80
                    ? 'bg-yellow-500'
                    : 'bg-electric-blue'
              )}
              style={{ width: reservationLimit === 'unlimited' ? '0%' : `${reservationPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {isNearLimit && (
        <p className="mt-4 text-sm text-red-400">
          You&apos;re approaching your plan limit. Upgrade to continue using all features without interruption.
        </p>
      )}
    </div>
  );
}
