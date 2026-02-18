'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Phone,
  MapPin,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Zap,
  CreditCard,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

interface PlanHealth {
  planName: string;
  planDisplayName: string;
  voiceMinutes: {
    used: number;
    limit: number;
    percentUsed: number;
    status: 'ok' | 'warning' | 'blocked';
  };
  locations: {
    used: number;
    limit: number;
    percentUsed: number;
    status: 'ok' | 'warning' | 'blocked';
  };
  unacknowledgedAlerts: number;
}

interface UsageOverviewProps {
  organizationId: string;
  className?: string;
}

/**
 * Get status color and icon based on limit status.
 */
function getStatusConfig(status: 'ok' | 'warning' | 'blocked') {
  switch (status) {
    case 'blocked':
      return {
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/20',
        barColor: 'bg-red-500',
        icon: AlertTriangle,
        label: 'Limit Reached',
      };
    case 'warning':
      return {
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/20',
        barColor: 'bg-yellow-500',
        icon: AlertTriangle,
        label: 'Approaching Limit',
      };
    default:
      return {
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/20',
        barColor: 'bg-green-500',
        icon: CheckCircle,
        label: 'Healthy',
      };
  }
}

/**
 * Progress bar component for usage display.
 */
function UsageProgressBar({
  label,
  used,
  limit,
  percentUsed,
  status,
  icon: Icon,
}: {
  label: string;
  used: number;
  limit: number;
  percentUsed: number;
  status: 'ok' | 'warning' | 'blocked';
  icon: React.ComponentType<{ className?: string }>;
}) {
  const config = getStatusConfig(status);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn('w-4 h-4', config.color)} />
          <span className="text-sm text-gray-400">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">
            {used.toLocaleString()} / {limit.toLocaleString()}
          </span>
          <span className={cn('text-xs px-1.5 py-0.5 rounded', config.bgColor, config.color)}>
            {percentUsed.toFixed(2)}%
          </span>
        </div>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', config.barColor)}
          style={{ width: `${Math.min(percentUsed, 100)}%` }}
        />
      </div>
    </div>
  );
}

/**
 * UsageOverview Component
 *
 * Displays a "Plan Health" card showing:
 * - Current plan name
 * - Voice minutes usage with progress bar
 * - Location usage with progress bar
 * - Overall health status
 * - Buy More Minutes button when at/near limit
 */
export function UsageOverview({ organizationId, className }: UsageOverviewProps) {
  const [health, setHealth] = useState<PlanHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyingMinutes, setBuyingMinutes] = useState(false);

  useEffect(() => {
    async function fetchPlanHealth() {
      try {
        const supabase = createClient();

        // Define expected types for the query results
        type OrgWithPlan = {
          voice_minutes_used: number | null;
          plan: { name: string; display_name: string; location_limit: number; minute_limit: number } | null;
        };

        // Fetch organization with plan info - use limit(1) to avoid throwing
        const { data: orgDataArray } = await supabase
          .from('organizations')
          .select(`
            voice_minutes_used,
            plan:plan_configs (
              name,
              display_name,
              location_limit,
              minute_limit
            )
          `)
          .eq('id', organizationId)
          .limit(1);

        // Type assertion for the organization data
        const org = (orgDataArray?.[0] ?? null) as unknown as OrgWithPlan | null;

        if (!org) {
          setLoading(false);
          return;
        }

        // Count restaurants
        const { count: locationCount } = await supabase
          .from('restaurants')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId);

        // Count unacknowledged alerts
        // Note: Type assertion needed until Supabase types are regenerated with usage_alerts table
        let alertCount: number | null = 0;
        try {
          const alertQuery = supabase
            .from('usage_alerts' as 'profiles')
            .select('id', { count: 'exact', head: true });
          // Apply filters using workaround for type mismatch
          const result = await (alertQuery as unknown as { eq: (col: string, val: unknown) => typeof alertQuery })
            .eq('organization_id', organizationId)
            .eq('acknowledged', false);
          alertCount = (result as unknown as { count: number | null }).count;
        } catch {
          alertCount = 0;
        }

        const plan = org.plan;
        const voiceUsed = org.voice_minutes_used || 0;
        const voiceLimit = plan?.minute_limit || 100;
        const voicePercent = voiceLimit > 0 ? (voiceUsed / voiceLimit) * 100 : 100;

        const locationsUsed = locationCount || 0;
        const locationsLimit = plan?.location_limit || 1;
        const locationsPercent = locationsLimit > 0 ? (locationsUsed / locationsLimit) * 100 : 100;

        const getStatus = (percent: number): 'ok' | 'warning' | 'blocked' => {
          if (percent >= 100) return 'blocked';
          if (percent >= 80) return 'warning';
          return 'ok';
        };

        setHealth({
          planName: plan?.name || 'free',
          planDisplayName: plan?.display_name || 'Free',
          voiceMinutes: {
            used: voiceUsed,
            limit: voiceLimit,
            percentUsed: voicePercent,
            status: getStatus(voicePercent),
          },
          locations: {
            used: locationsUsed,
            limit: locationsLimit,
            percentUsed: locationsPercent,
            status: getStatus(locationsPercent),
          },
          unacknowledgedAlerts: alertCount || 0,
        });
      } catch (error) {
        console.error('Failed to fetch plan health:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPlanHealth();
  }, [organizationId]);

  const handleBuyMinutes = async () => {
    setBuyingMinutes(true);
    try {
      // Call Stripe checkout endpoint for minute top-up
      const response = await fetch('/api/billing/buy-minutes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      });

      const { url, error } = await response.json();
      if (error) {
        console.error('Failed to create checkout session:', error);
        return;
      }

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error('Failed to initiate minute purchase:', error);
    } finally {
      setBuyingMinutes(false);
    }
  };

  if (loading) {
    return (
      <div className={cn('rounded-xl bg-slate-900/50 border border-slate-800 p-6 animate-pulse', className)}>
        <div className="h-6 bg-slate-800 rounded w-1/3 mb-4" />
        <div className="space-y-4">
          <div className="h-2 bg-slate-800 rounded w-full" />
          <div className="h-2 bg-slate-800 rounded w-full" />
        </div>
      </div>
    );
  }

  if (!health) {
    return null;
  }

  // Determine overall health status
  const overallStatus =
    health.voiceMinutes.status === 'blocked' || health.locations.status === 'blocked'
      ? 'blocked'
      : health.voiceMinutes.status === 'warning' || health.locations.status === 'warning'
        ? 'warning'
        : 'ok';

  const overallConfig = getStatusConfig(overallStatus);
  const showBuyMinutes = health.voiceMinutes.status === 'warning' || health.voiceMinutes.status === 'blocked';
  const showUpgrade = overallStatus !== 'ok' && health.planName !== 'enterprise';

  return (
    <div
      className={cn(
        'rounded-xl border p-6 transition-colors',
        overallConfig.bgColor,
        overallConfig.borderColor,
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', overallConfig.bgColor)}>
            <TrendingUp className={cn('w-5 h-5', overallConfig.color)} />
          </div>
          <div>
            <h3 className="font-semibold text-white">Plan Health</h3>
            <p className="text-sm text-gray-400">{health.planDisplayName} Plan</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full', overallConfig.bgColor)}>
          <overallConfig.icon className={cn('w-4 h-4', overallConfig.color)} />
          <span className={cn('text-sm font-medium', overallConfig.color)}>{overallConfig.label}</span>
        </div>
      </div>

      {/* Unacknowledged Alerts Banner */}
      {health.unacknowledgedAlerts > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400">
              {health.unacknowledgedAlerts} unacknowledged alert{health.unacknowledgedAlerts !== 1 ? 's' : ''}
            </span>
          </div>
          <Link
            href="/dashboard/billing/alerts"
            className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
          >
            View <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Usage Bars */}
      <div className="space-y-4">
        <UsageProgressBar
          label="Voice Minutes"
          used={health.voiceMinutes.used}
          limit={health.voiceMinutes.limit}
          percentUsed={health.voiceMinutes.percentUsed}
          status={health.voiceMinutes.status}
          icon={Phone}
        />

        <UsageProgressBar
          label="Locations"
          used={health.locations.used}
          limit={health.locations.limit}
          percentUsed={health.locations.percentUsed}
          status={health.locations.status}
          icon={MapPin}
        />
      </div>

      {/* Action Buttons */}
      {(showBuyMinutes || showUpgrade) && (
        <div className="mt-6 flex flex-wrap gap-3">
          {showBuyMinutes && (
            <button
              onClick={handleBuyMinutes}
              disabled={buyingMinutes}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                health.voiceMinutes.status === 'blocked'
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-yellow-500 hover:bg-yellow-600 text-black'
              )}
            >
              <CreditCard className="w-4 h-4" />
              {buyingMinutes ? 'Loading...' : 'Buy More Minutes'}
            </button>
          )}

          {showUpgrade && (
            <Link
              href="/dashboard/billing"
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-electric-blue hover:bg-electric-blue/80 text-white transition-colors"
            >
              <Zap className="w-4 h-4" />
              Upgrade Plan
            </Link>
          )}
        </div>
      )}

      {/* Tip for healthy accounts */}
      {overallStatus === 'ok' && (
        <p className="mt-4 text-sm text-gray-500">
          Your usage is within plan limits. Voice minutes reset monthly.
        </p>
      )}
    </div>
  );
}
