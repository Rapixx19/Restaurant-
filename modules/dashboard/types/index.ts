import type { User } from '@supabase/supabase-js';
import type { Profile, Restaurant } from '@/lib/supabase/types';

/**
 * Types for the dashboard module.
 */

export interface OrganizationUsage {
  planName: string;
  planDisplayName: string;
  voiceMinutesUsed: number;
  voiceMinutesLimit: number;
  locationsUsed: number;
  locationsLimit: number;
  isOwner: boolean;
  organizationId: string | null;
}

export interface DashboardNavProps {
  user: User;
  profile: Profile | null;
  restaurant: Restaurant | null;
  organizationUsage?: OrganizationUsage;
}

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface DashboardHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export interface DashboardStatsProps {
  stats: {
    label: string;
    value: string | number;
    change?: string;
    trend?: 'up' | 'down' | 'neutral';
  }[];
}
