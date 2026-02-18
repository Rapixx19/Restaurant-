'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Restaurant, Profile } from '@/lib/database.types';
import type { User } from '@supabase/supabase-js';

/**
 * Organization usage data for plan limits display.
 */
export interface OrganizationUsage {
  planName: string;
  planDisplayName: string;
  voiceMinutesUsed: number;
  voiceMinutesLimit: number;
  locationsUsed: number;
  locationsLimit: number;
  isOwner: boolean;
  organizationId: string;
}

/**
 * Restaurant context value containing all session/restaurant data.
 * This eliminates the need to pass restaurantId as props throughout the app.
 */
export interface RestaurantContextValue {
  /** Current authenticated user */
  user: User;
  /** User's profile data */
  profile: Profile | null;
  /** Current restaurant (auto-selected, first one for single-location users) */
  restaurant: Restaurant | null;
  /** Restaurant ID shortcut */
  restaurantId: string | null;
  /** Restaurant name shortcut */
  restaurantName: string | null;
  /** Organization usage/limits data */
  organizationUsage: OrganizationUsage | undefined;
  /** Organization ID from the restaurant */
  organizationId: string | null;
}

const RestaurantContext = createContext<RestaurantContextValue | null>(null);

interface RestaurantProviderProps {
  children: ReactNode;
  user: User;
  profile: Profile | null;
  restaurant: (Restaurant & { organization_id?: string }) | null;
  organizationUsage: OrganizationUsage | undefined;
}

/**
 * RestaurantProvider wraps the dashboard to provide restaurant context.
 *
 * Usage in any client component:
 * ```tsx
 * const { restaurant, restaurantId, user } = useRestaurant();
 * ```
 */
export function RestaurantProvider({
  children,
  user,
  profile,
  restaurant,
  organizationUsage,
}: RestaurantProviderProps) {
  // Debug logging for hydration issues
  if (typeof window !== 'undefined') {
    console.log('🍽️ RestaurantProvider Data:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      hasProfile: !!profile,
      profileName: profile?.full_name,
      hasRestaurant: !!restaurant,
      restaurantId: restaurant?.id,
      restaurantName: restaurant?.name,
      organizationId: restaurant?.organization_id,
      hasOrganizationUsage: !!organizationUsage,
    });
  }

  const value: RestaurantContextValue = {
    user,
    profile,
    restaurant,
    restaurantId: restaurant?.id ?? null,
    restaurantName: restaurant?.name ?? null,
    organizationUsage,
    organizationId: restaurant?.organization_id ?? null,
  };

  return (
    <RestaurantContext.Provider value={value}>
      {children}
    </RestaurantContext.Provider>
  );
}

/**
 * Hook to access restaurant context.
 * Must be used within a RestaurantProvider.
 *
 * @throws Error if used outside of RestaurantProvider
 */
export function useRestaurant(): RestaurantContextValue {
  const context = useContext(RestaurantContext);

  if (!context) {
    // Enhanced error logging for debugging hydration issues
    if (typeof window !== 'undefined') {
      console.error('🚨 useRestaurant Error:', {
        error: 'Context is null - component rendered outside RestaurantProvider',
        stack: new Error().stack,
        location: window.location.pathname,
      });
    }

    throw new Error(
      'useRestaurant must be used within a RestaurantProvider. ' +
      'Wrap your component tree with <RestaurantProvider>.'
    );
  }

  return context;
}

/**
 * Hook to access restaurant context, returning null if not available.
 * Safe to use in components that might render outside the provider.
 */
export function useRestaurantOptional(): RestaurantContextValue | null {
  return useContext(RestaurantContext);
}
