import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logging/server';

const logger = createLogger('Gatekeeper');

/**
 * Gatekeeper: Plan limit checking utilities
 *
 * Provides functions to check whether an organization is within their plan limits.
 *
 * Performance: Queries use indexed columns (organization_id, owner_id, user_id)
 * for efficient lookups. See migrations for index definitions.
 */

export interface PlanLimits {
  locationLimit: number;
  minuteLimit: number;
  currentLocations: number;
  currentMinutes: number;
  planName: string;
  planDisplayName: string;
}

/**
 * Plan upgrade path for user-friendly messages.
 */
const PLAN_UPGRADE_PATH: Record<string, string> = {
  free: 'Starter',
  starter: 'Professional',
  professional: 'Enterprise',
  enterprise: 'Enterprise', // Already at top
};

export type LimitStatus = 'ok' | 'warning' | 'blocked';

export interface LimitCheckResult {
  allowed: boolean;
  status: LimitStatus;
  reason?: string;
  current: number;
  limit: number;
  remaining: number;
  percentUsed: number;
}

export interface UsageAlert {
  type: 'warning' | 'overage';
  resource: 'voice_minutes' | 'locations';
  organizationId: string;
  organizationName?: string;
  current: number;
  limit: number;
  percentUsed: number;
}

/**
 * Get the organization's plan limits and current usage.
 */
export async function getOrganizationLimits(orgId: string): Promise<PlanLimits | null> {
  const supabase = await createClient();

  // Get organization with plan info
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select(`
      id,
      voice_minutes_used,
      plan:plan_configs (
        name,
        display_name,
        location_limit,
        minute_limit
      )
    `)
    .eq('id', orgId)
    .single() as {
      data: {
        id: string;
        voice_minutes_used: number;
        plan: { name: string; display_name: string; location_limit: number; minute_limit: number } | null;
      } | null;
      error: Error | null;
    };

  if (orgError || !org) {
    logger.error('Failed to get organization limits', { error: orgError, organizationId: orgId });
    return null;
  }

  // Count restaurants in organization
  const { count: locationCount } = await supabase
    .from('restaurants')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId);

  return {
    locationLimit: org.plan?.location_limit ?? 1,
    minuteLimit: org.plan?.minute_limit ?? 100,
    currentLocations: locationCount ?? 0,
    currentMinutes: org.voice_minutes_used ?? 0,
    planName: org.plan?.name ?? 'free',
    planDisplayName: org.plan?.display_name ?? 'Free',
  };
}

/**
 * Determine limit status based on percentage used.
 * - ok: < 80%
 * - warning: >= 80% and < 100%
 * - blocked: >= 100%
 */
function getLimitStatus(current: number, limit: number): LimitStatus {
  if (limit === 0) return 'blocked';
  const percentUsed = (current / limit) * 100;
  if (percentUsed >= 100) return 'blocked';
  if (percentUsed >= 80) return 'warning';
  return 'ok';
}

/**
 * Check if the organization can add another location.
 * Returns status: 'ok' | 'warning' | 'blocked'
 */
export async function checkLocationLimit(orgId: string): Promise<LimitCheckResult> {
  const limits = await getOrganizationLimits(orgId);

  if (!limits) {
    return {
      allowed: false,
      status: 'blocked',
      reason: 'Unable to verify organization limits',
      current: 0,
      limit: 0,
      remaining: 0,
      percentUsed: 0,
    };
  }

  const { currentLocations, locationLimit, planDisplayName, planName } = limits;
  const remaining = locationLimit - currentLocations;
  const percentUsed = locationLimit > 0 ? (currentLocations / locationLimit) * 100 : 100;
  const status = getLimitStatus(currentLocations, locationLimit);
  const allowed = status !== 'blocked';

  // Get the next plan name for upgrade suggestion
  const nextPlan = PLAN_UPGRADE_PATH[planName] || 'a higher plan';

  let reason: string | undefined;
  if (status === 'blocked') {
    reason = `You've reached the location limit for your ${planDisplayName} plan. Upgrade to ${nextPlan} for more locations.`;
  } else if (status === 'warning') {
    reason = `You're approaching your location limit (${currentLocations}/${locationLimit}). Consider upgrading to ${nextPlan}.`;
  }

  return {
    allowed,
    status,
    reason,
    current: currentLocations,
    limit: locationLimit,
    remaining: Math.max(0, remaining),
    percentUsed: Math.round(percentUsed * 10) / 10,
  };
}

/**
 * Check if the organization can use more voice minutes.
 * Returns status: 'ok' | 'warning' (>= 80%) | 'blocked' (>= 100%)
 */
export async function checkMinuteLimit(orgId: string): Promise<LimitCheckResult> {
  const limits = await getOrganizationLimits(orgId);

  if (!limits) {
    return {
      allowed: false,
      status: 'blocked',
      reason: 'Unable to verify organization limits',
      current: 0,
      limit: 0,
      remaining: 0,
      percentUsed: 0,
    };
  }

  const { currentMinutes, minuteLimit, planDisplayName, planName } = limits;
  const remaining = minuteLimit - currentMinutes;
  const percentUsed = minuteLimit > 0 ? (currentMinutes / minuteLimit) * 100 : 100;
  const status = getLimitStatus(currentMinutes, minuteLimit);
  const allowed = status !== 'blocked';

  // Get the next plan name for upgrade suggestion
  const nextPlan = PLAN_UPGRADE_PATH[planName] || 'a higher plan';

  let reason: string | undefined;
  if (status === 'blocked') {
    reason = `You've used all ${minuteLimit} voice minutes included in your ${planDisplayName} plan. Upgrade to ${nextPlan} or buy more minutes.`;
  } else if (status === 'warning') {
    reason = `You've used ${Math.round(percentUsed)}% of your voice minutes (${currentMinutes}/${minuteLimit}). Consider upgrading to ${nextPlan}.`;
  }

  return {
    allowed,
    status,
    reason,
    current: currentMinutes,
    limit: minuteLimit,
    remaining: Math.max(0, remaining),
    percentUsed: Math.round(percentUsed * 10) / 10,
  };
}

/**
 * Check if a specific number of minutes can be used.
 */
export async function canUseMinutes(orgId: string, minutes: number): Promise<LimitCheckResult> {
  const limits = await getOrganizationLimits(orgId);

  if (!limits) {
    return {
      allowed: false,
      status: 'blocked',
      reason: 'Unable to verify organization limits',
      current: 0,
      limit: 0,
      remaining: 0,
      percentUsed: 0,
    };
  }

  const { currentMinutes, minuteLimit, planDisplayName, planName } = limits;
  const remaining = minuteLimit - currentMinutes;
  const wouldUse = currentMinutes + minutes;
  const percentUsed = minuteLimit > 0 ? (wouldUse / minuteLimit) * 100 : 100;
  const status = getLimitStatus(wouldUse, minuteLimit);
  const allowed = remaining >= minutes;

  // Get the next plan name for upgrade suggestion
  const nextPlan = PLAN_UPGRADE_PATH[planName] || 'a higher plan';

  return {
    allowed,
    status,
    reason: allowed
      ? undefined
      : `Not enough voice minutes remaining on your ${planDisplayName} plan. You have ${remaining} minute${remaining === 1 ? '' : 's'} left. Upgrade to ${nextPlan} for more.`,
    current: currentMinutes,
    limit: minuteLimit,
    remaining: Math.max(0, remaining),
    percentUsed: Math.round(percentUsed * 10) / 10,
  };
}

/**
 * Send usage alert via email and/or Slack.
 * Called when usage exceeds thresholds (80% warning, 100% overage).
 */
export async function sendUsageAlert(alert: UsageAlert): Promise<void> {
  const supabase = await createClient();

  // Get organization details for alert
  const { data: org } = await supabase
    .from('organizations')
    .select('name, owner_id, profiles(email)')
    .eq('id', alert.organizationId)
    .single() as {
      data: { name: string; owner_id: string; profiles: { email: string } | null } | null;
      error: Error | null;
    };

  const orgName = org?.name || 'Unknown Organization';
  const ownerEmail = org?.profiles?.email;

  // Log the alert
  logger.info('Usage alert triggered', {
    type: alert.type,
    resource: alert.resource,
    organization: orgName,
    current: alert.current,
    limit: alert.limit,
    percentUsed: alert.percentUsed,
  });

  // Store alert in database for dashboard display
  // Note: Type assertion needed until Supabase types are regenerated with usage_alerts table
  try {
    const alertData = {
      organization_id: alert.organizationId,
      type: alert.type,
      resource: alert.resource,
      current_usage: alert.current,
      limit_amount: alert.limit,
      percent_used: alert.percentUsed,
      acknowledged: false,
    };
    const { error: insertError } = await supabase
      .from('usage_alerts' as 'profiles')
      .insert(alertData as never);
    if (insertError) {
      logger.error('Failed to store usage alert', { error: insertError, organizationId: alert.organizationId });
    }
  } catch (err) {
    logger.error('Failed to store usage alert', { error: err, organizationId: alert.organizationId });
  }

  // Send email alert if we have the owner's email
  if (ownerEmail && process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      const subject = alert.type === 'overage'
        ? `[URGENT] Voice minute limit exceeded - ${orgName}`
        : `Voice minute usage warning - ${orgName}`;

      const resourceLabel = alert.resource === 'voice_minutes' ? 'voice minutes' : 'locations';

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'VECTERAI <alerts@vecterai.com>',
        to: ownerEmail,
        subject,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: ${alert.type === 'overage' ? '#ef4444' : '#f59e0b'};">
              ${alert.type === 'overage' ? 'Usage Limit Exceeded' : 'Usage Warning'}
            </h2>
            <p>Your organization <strong>${orgName}</strong> has ${alert.type === 'overage' ? 'exceeded' : 'reached ' + Math.round(alert.percentUsed) + '% of'} the ${resourceLabel} limit.</p>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0;"><strong>Current Usage:</strong> ${alert.current} / ${alert.limit} ${resourceLabel}</p>
              <p style="margin: 8px 0 0;"><strong>Percent Used:</strong> ${Math.round(alert.percentUsed)}%</p>
            </div>
            ${alert.type === 'overage'
              ? '<p style="color: #ef4444;"><strong>Action Required:</strong> Voice AI calls will be limited until you upgrade or purchase additional minutes.</p>'
              : '<p>Consider upgrading your plan or purchasing additional minutes to avoid service interruption.</p>'
            }
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://vecterai.com'}/dashboard/billing"
               style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
              ${alert.type === 'overage' ? 'Buy More Minutes' : 'View Billing'}
            </a>
          </div>
        `,
      });
    } catch (error) {
      logger.error('Failed to send usage alert email', { error, organizationId: alert.organizationId });
    }
  }

  // Send Slack alert if webhook is configured
  const slackWebhook = process.env.SLACK_ALERTS_WEBHOOK;
  if (slackWebhook) {
    try {
      const emoji = alert.type === 'overage' ? ':rotating_light:' : ':warning:';
      const color = alert.type === 'overage' ? '#ef4444' : '#f59e0b';

      await fetch(slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `${emoji} Usage Alert: ${orgName}`,
          attachments: [{
            color,
            fields: [
              { title: 'Organization', value: orgName, short: true },
              { title: 'Alert Type', value: alert.type.toUpperCase(), short: true },
              { title: 'Resource', value: alert.resource, short: true },
              { title: 'Usage', value: `${alert.current} / ${alert.limit} (${Math.round(alert.percentUsed)}%)`, short: true },
            ],
          }],
        }),
      });
    } catch (error) {
      logger.error('Failed to send Slack alert', { error, organizationId: alert.organizationId });
    }
  }
}

/**
 * Increment voice minutes used by an organization.
 * Checks for warning/overage thresholds and sends alerts.
 */
export async function incrementVoiceMinutes(
  orgId: string,
  minutes: number
): Promise<{ success: boolean; status: LimitStatus; alert?: UsageAlert }> {
  const supabase = await createClient();

  // Get current usage and limits
  const { data: org } = await supabase
    .from('organizations')
    .select(`
      name,
      voice_minutes_used,
      plan:plan_configs (
        minute_limit
      )
    `)
    .eq('id', orgId)
    .single() as {
      data: {
        name: string;
        voice_minutes_used: number;
        plan: { minute_limit: number } | null;
      } | null;
      error: Error | null;
    };

  if (!org) {
    logger.error('Organization not found for minute increment', { organizationId: orgId });
    return { success: false, status: 'blocked' };
  }

  const currentMinutes = org.voice_minutes_used || 0;
  const minuteLimit = org.plan?.minute_limit || 100;
  const newTotal = currentMinutes + minutes;
  const previousPercent = (currentMinutes / minuteLimit) * 100;
  const newPercent = (newTotal / minuteLimit) * 100;

  // Update the minutes
  const { error: updateError } = await supabase
    .from('organizations')
    .update({ voice_minutes_used: newTotal })
    .eq('id', orgId);

  if (updateError) {
    logger.error('Failed to increment voice minutes', { error: updateError, organizationId: orgId });
    return { success: false, status: 'blocked' };
  }

  // Determine status and send alerts if thresholds crossed
  const status = getLimitStatus(newTotal, minuteLimit);
  let alert: UsageAlert | undefined;

  // Check if we crossed the 80% warning threshold
  if (previousPercent < 80 && newPercent >= 80 && newPercent < 100) {
    alert = {
      type: 'warning',
      resource: 'voice_minutes',
      organizationId: orgId,
      organizationName: org.name,
      current: newTotal,
      limit: minuteLimit,
      percentUsed: newPercent,
    };
    sendUsageAlert(alert).catch((err) => logger.error('Failed to send usage alert', { error: err }));
  }
  // Check if we crossed the 100% overage threshold
  else if (previousPercent < 100 && newPercent >= 100) {
    alert = {
      type: 'overage',
      resource: 'voice_minutes',
      organizationId: orgId,
      organizationName: org.name,
      current: newTotal,
      limit: minuteLimit,
      percentUsed: newPercent,
    };
    sendUsageAlert(alert).catch((err) => logger.error('Failed to send usage alert', { error: err }));
  }

  return { success: true, status, alert };
}

/**
 * Get organization ID for a user.
 */
export async function getUserOrganizationId(userId: string): Promise<string | null> {
  const supabase = await createClient();

  // First check if user owns an organization
  const { data: ownedOrg } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', userId)
    .single();

  if (ownedOrg) {
    return ownedOrg.id;
  }

  // Check if user is a member of an organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .single();

  return membership?.organization_id ?? null;
}

/**
 * Get organization ID from restaurant ID.
 */
export async function getRestaurantOrganizationId(restaurantId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('organization_id')
    .eq('id', restaurantId)
    .single();

  return restaurant?.organization_id ?? null;
}

/**
 * Check all limits for an organization.
 */
export async function checkAllLimits(orgId: string): Promise<{
  locations: LimitCheckResult;
  minutes: LimitCheckResult;
  limits: PlanLimits | null;
}> {
  const [locations, minutes, limits] = await Promise.all([
    checkLocationLimit(orgId),
    checkMinuteLimit(orgId),
    getOrganizationLimits(orgId),
  ]);

  return { locations, minutes, limits };
}
