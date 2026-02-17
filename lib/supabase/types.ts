/**
 * Re-export all database types for use across the application.
 * Import from '@/lib/supabase/types' for consistency.
 */

export * from '../database.types';

export type { SupabaseClient } from '@supabase/supabase-js';

import type { Json } from '../database.types';

/**
 * Extended Restaurant type with all fields.
 * This extends the generated type to include fields that may not be
 * in the generated types if the database hasn't been migrated yet.
 */
export interface Restaurant {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: Json;
  timezone: string;
  currency?: string;
  image_url?: string | null;
  settings?: Json;
  created_at: string;
  updated_at?: string;
}

/**
 * Extended Profile type with all fields.
 */
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Reservation type for dashboard components.
 */
export interface Reservation {
  id: string;
  restaurant_id: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
  source: 'phone' | 'chat' | 'website' | 'walk_in' | 'manual' | 'ai';
  special_requests: string | null;
  internal_notes: string | null;
  table_assignment: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Order type for dashboard components.
 */
export interface Order {
  id: string;
  restaurant_id: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  type: 'dine_in' | 'takeout' | 'delivery';
  status: 'pending' | 'paid' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  source: 'phone' | 'chat' | 'website' | 'walk_in' | 'manual' | 'ai';
  items: Json;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  special_instructions: string | null;
  delivery_address: Json | null;
  estimated_ready_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}
