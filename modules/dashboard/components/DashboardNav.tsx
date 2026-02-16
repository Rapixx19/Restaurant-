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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logout } from '@/modules/auth/actions/logout';
import type { DashboardNavProps, NavItem } from '../types';

const navItems: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Conversations', href: '/dashboard/conversations', icon: MessageCircle },
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
 * Dashboard navigation sidebar and mobile header.
 */
export function DashboardNav({ user, profile, restaurant }: DashboardNavProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const displayName = profile?.full_name || user.email?.split('@')[0] || 'User';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

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
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
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
