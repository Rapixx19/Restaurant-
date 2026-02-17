'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageCircle,
  CalendarCheck,
  ShoppingBag,
  Users,
  UtensilsCrossed,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Store,
  BarChart2,
  Phone,
  Building2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logout } from '@/modules/auth/actions/logout';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import type { DashboardNavProps, NavItem } from '../types';

const navItems: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart2 },
  { label: 'Conversations', href: '/dashboard/conversations', icon: MessageCircle },
  { label: 'Calls', href: '/dashboard/calls', icon: Phone },
  { label: 'Reservations', href: '/dashboard/reservations', icon: CalendarCheck },
  { label: 'Orders', href: '/dashboard/orders', icon: ShoppingBag },
  { label: 'Menu', href: '/dashboard/menu', icon: UtensilsCrossed },
  { label: 'Customers', href: '/dashboard/customers', icon: Users },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

/**
 * Check if a nav item is active based on the current pathname.
 * Overview is only active on exact match, others match prefix.
 */
function isNavItemActive(href: string, pathname: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard';
  }
  return pathname.startsWith(href);
}

/**
 * Progress bar component for usage display.
 */
function UsageProgressBar({
  current,
  max,
  label,
  unit,
}: {
  current: number;
  max: number;
  label: string;
  unit: string;
}) {
  const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className={cn(
          'font-medium',
          isAtLimit ? 'text-red-400' : isNearLimit ? 'text-amber-400' : 'text-gray-300'
        )}>
          {current.toLocaleString()} / {max.toLocaleString()} {unit}
        </span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isAtLimit
              ? 'bg-red-500'
              : isNearLimit
                ? 'bg-amber-500'
                : 'bg-electric-blue'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Dashboard navigation sidebar and mobile header.
 */
export function DashboardNav({ user, profile, restaurant, organizationUsage }: DashboardNavProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Debug logging for hydration issues
  if (typeof window !== 'undefined') {
    console.log('[DashboardNav] Current User:', user);
    console.log('[DashboardNav] Current Profile:', profile);
    console.log('[DashboardNav] Current Restaurant:', restaurant);
  }

  // Defensive: handle potential undefined user during hydration
  const userEmail = user?.email ?? '';
  const displayName = profile?.full_name || userEmail.split('@')[0] || 'User';
  const initials = displayName
    .split(' ')
    .map((n) => n?.[0] ?? '')
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  // Plan display name mapping
  const getPlanBadgeColor = (planName: string) => {
    switch (planName) {
      case 'enterprise':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'professional':
        return 'bg-electric-blue/20 text-electric-blue border-electric-blue/30';
      case 'starter':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // Don't show full nav during onboarding
  const isOnboarding = pathname === '/onboarding';

  if (isOnboarding) {
    return (
      <>
        {/* Minimal header for onboarding */}
        <div className="fixed top-0 left-0 right-0 z-40 bg-deep-navy/95 backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center justify-center h-16 px-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-electric-blue to-blue-400 flex items-center justify-center">
                <span className="text-white font-bold">V</span>
              </div>
              <span className="text-lg font-bold text-white">VECTERAI</span>
            </Link>
          </div>
        </div>
        <div className="h-16" />
      </>
    );
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-deep-navy/95 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between h-16 px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-electric-blue to-blue-400 flex items-center justify-center">
              <span className="text-white font-bold">V</span>
            </div>
            <span className="text-lg font-bold text-white">VECTERAI</span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-gray-400 hover:text-white"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="px-4 py-4 space-y-1 border-t border-white/10">
            {navItems.map((item) => {
              const isActive = isNavItemActive(item.href, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    isActive
                      ? 'bg-electric-blue/10 text-electric-blue'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
            <form action={logout}>
              <button
                type="submit"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 w-full"
              >
                <LogOut className="w-5 h-5" />
                Sign out
              </button>
            </form>
          </nav>
        )}
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-card border-r border-white/10">
        {/* Logo & Restaurant */}
        <div className="border-b border-white/10">
          <div className="flex items-center h-16 px-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-electric-blue to-blue-400 flex items-center justify-center">
                <span className="text-white font-bold">V</span>
              </div>
              <span className="text-lg font-bold text-white">VECTERAI</span>
            </Link>
          </div>
          {restaurant && (
            <div className="px-6 pb-4">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
                <Store className="w-4 h-4 text-electric-blue" />
                <span className="text-sm font-medium text-white truncate">
                  {restaurant.name}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = isNavItemActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-electric-blue/10 text-electric-blue'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Usage Section */}
        {organizationUsage && (
          <div className="px-4 py-4 border-t border-white/10">
            {/* Plan Badge */}
            <div className="flex items-center justify-between mb-3">
              <span className={cn(
                'px-2 py-0.5 text-xs font-medium rounded-full border',
                getPlanBadgeColor(organizationUsage.planName)
              )}>
                {organizationUsage.planDisplayName}
              </span>
              {organizationUsage.planName !== 'enterprise' && (
                <Link
                  href="/dashboard/settings/billing"
                  className="text-xs text-electric-blue hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Upgrade
                </Link>
              )}
            </div>

            {/* Voice Minutes Usage */}
            <ErrorBoundary componentName="UsageProgressBar" minimal>
              <UsageProgressBar
                current={organizationUsage.voiceMinutesUsed}
                max={organizationUsage.voiceMinutesLimit}
                label="Voice Minutes"
                unit="mins"
              />
            </ErrorBoundary>

            {/* Manage Organization Link (owners only) */}
            {organizationUsage.isOwner && organizationUsage.organizationId && (
              <Link
                href="/dashboard/settings/organization"
                className="flex items-center gap-2 mt-3 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <Building2 className="w-4 h-4" />
                Manage Organization
              </Link>
            )}
          </div>
        )}

        {/* User Menu */}
        <div className="p-4 border-t border-white/10">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg hover:bg-white/5 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-electric-blue/20 flex items-center justify-center">
                <span className="text-sm font-medium text-electric-blue">{initials}</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-white truncate">{displayName}</p>
                <p className="text-xs text-gray-500 truncate">{userEmail}</p>
              </div>
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-gray-400 transition-transform',
                  userMenuOpen && 'rotate-180'
                )}
              />
            </button>

            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-white/10 rounded-lg shadow-xl overflow-hidden">
                <form action={logout}>
                  <button
                    type="submit"
                    className="flex items-center gap-3 w-full px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    Sign out
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Spacer for mobile header */}
      <div className="lg:hidden h-16" />
    </>
  );
}
