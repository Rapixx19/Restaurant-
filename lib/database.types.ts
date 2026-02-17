/**
 * Database types generated from the VECTERAI Master Schema.
 * These types represent the Supabase/PostgreSQL database structure.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      restaurants: {
        Row: {
          id: string;
          owner_id: string;
          organization_id: string | null;
          name: string;
          slug: string;
          description: string | null;
          phone: string | null;
          email: string | null;
          website: string | null;
          address: Json | null;
          timezone: string;
          currency: string;
          image_url: string | null;
          settings: Json;
          status: 'pending' | 'reviewing' | 'info_requested' | 'active' | 'suspended';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          organization_id?: string | null;
          name: string;
          slug: string;
          description?: string | null;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          address?: Json | null;
          timezone?: string;
          currency?: string;
          image_url?: string | null;
          settings?: Json;
          status?: 'pending' | 'reviewing' | 'info_requested' | 'active' | 'suspended';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          organization_id?: string | null;
          name?: string;
          slug?: string;
          description?: string | null;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          address?: Json | null;
          timezone?: string;
          currency?: string;
          image_url?: string | null;
          settings?: Json;
          status?: 'pending' | 'reviewing' | 'info_requested' | 'active' | 'suspended';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      restaurant_members: {
        Row: {
          id: string;
          restaurant_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'manager' | 'staff';
          permissions: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          user_id: string;
          role?: 'owner' | 'admin' | 'manager' | 'staff';
          permissions?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          user_id?: string;
          role?: 'owner' | 'admin' | 'manager' | 'staff';
          permissions?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      menu_categories: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          description: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          name?: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      menu_items: {
        Row: {
          id: string;
          restaurant_id: string;
          category_id: string | null;
          name: string;
          description: string | null;
          price: number;
          image_url: string | null;
          allergens: string[];
          dietary_tags: string[];
          is_available: boolean;
          is_featured: boolean;
          sort_order: number;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          category_id?: string | null;
          name: string;
          description?: string | null;
          price: number;
          image_url?: string | null;
          allergens?: string[];
          dietary_tags?: string[];
          is_available?: boolean;
          is_featured?: boolean;
          sort_order?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          category_id?: string | null;
          name?: string;
          description?: string | null;
          price?: number;
          image_url?: string | null;
          allergens?: string[];
          dietary_tags?: string[];
          is_available?: boolean;
          is_featured?: boolean;
          sort_order?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          restaurant_id: string;
          phone: string;
          email: string | null;
          full_name: string | null;
          preferences: Json;
          allergens: string[];
          notes: string | null;
          visit_count: number;
          total_spent: number;
          last_visit_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          phone: string;
          email?: string | null;
          full_name?: string | null;
          preferences?: Json;
          allergens?: string[];
          notes?: string | null;
          visit_count?: number;
          total_spent?: number;
          last_visit_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          phone?: string;
          email?: string | null;
          full_name?: string | null;
          preferences?: Json;
          allergens?: string[];
          notes?: string | null;
          visit_count?: number;
          total_spent?: number;
          last_visit_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reservations: {
        Row: {
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
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          customer_id?: string | null;
          customer_name: string;
          customer_phone: string;
          customer_email?: string | null;
          party_size: number;
          reservation_date: string;
          reservation_time: string;
          duration_minutes?: number;
          status?: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
          source?: 'phone' | 'chat' | 'website' | 'walk_in' | 'manual' | 'ai';
          special_requests?: string | null;
          internal_notes?: string | null;
          table_assignment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          customer_id?: string | null;
          customer_name?: string;
          customer_phone?: string;
          customer_email?: string | null;
          party_size?: number;
          reservation_date?: string;
          reservation_time?: string;
          duration_minutes?: number;
          status?: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
          source?: 'phone' | 'chat' | 'website' | 'walk_in' | 'manual' | 'ai';
          special_requests?: string | null;
          internal_notes?: string | null;
          table_assignment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          restaurant_id: string;
          customer_id: string | null;
          customer_name: string;
          customer_phone: string;
          customer_email: string | null;
          type: 'dine_in' | 'takeout' | 'delivery';
          status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
          source: 'phone' | 'chat' | 'website' | 'walk_in' | 'manual';
          items: Json;
          subtotal: number;
          tax: number;
          tip: number;
          total: number;
          payment_status: 'pending' | 'paid' | 'refunded';
          payment_method: string | null;
          special_instructions: string | null;
          delivery_address: Json | null;
          estimated_ready_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          customer_id?: string | null;
          customer_name: string;
          customer_phone: string;
          customer_email?: string | null;
          type?: 'dine_in' | 'takeout' | 'delivery';
          status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
          source?: 'phone' | 'chat' | 'website' | 'walk_in' | 'manual';
          items?: Json;
          subtotal?: number;
          tax?: number;
          tip?: number;
          total?: number;
          payment_status?: 'pending' | 'paid' | 'refunded';
          payment_method?: string | null;
          special_instructions?: string | null;
          delivery_address?: Json | null;
          estimated_ready_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          customer_id?: string | null;
          customer_name?: string;
          customer_phone?: string;
          customer_email?: string | null;
          type?: 'dine_in' | 'takeout' | 'delivery';
          status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
          source?: 'phone' | 'chat' | 'website' | 'walk_in' | 'manual';
          items?: Json;
          subtotal?: number;
          tax?: number;
          tip?: number;
          total?: number;
          payment_status?: 'pending' | 'paid' | 'refunded';
          payment_method?: string | null;
          special_instructions?: string | null;
          delivery_address?: Json | null;
          estimated_ready_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      call_logs: {
        Row: {
          id: string;
          restaurant_id: string;
          call_id: string;
          assistant_id: string | null;
          phone_number: string | null;
          caller_phone: string | null;
          direction: 'inbound' | 'outbound';
          status: 'active' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'no-answer';
          duration_seconds: number | null;
          started_at: string;
          ended_at: string | null;
          transcript: Json | null;
          summary: string | null;
          sentiment: 'positive' | 'neutral' | 'negative' | null;
          intent: string | null;
          customer_name: string | null;
          customer_phone: string | null;
          reservation_id: string | null;
          order_id: string | null;
          recording_url: string | null;
          language_detected: string | null;
          language_segments: Json | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          call_id: string;
          assistant_id?: string | null;
          phone_number?: string | null;
          caller_phone?: string | null;
          direction?: 'inbound' | 'outbound';
          status?: 'active' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'no-answer';
          duration_seconds?: number | null;
          started_at?: string;
          ended_at?: string | null;
          transcript?: Json | null;
          summary?: string | null;
          sentiment?: 'positive' | 'neutral' | 'negative' | null;
          intent?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          reservation_id?: string | null;
          order_id?: string | null;
          recording_url?: string | null;
          language_detected?: string | null;
          language_segments?: Json | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          call_id?: string;
          assistant_id?: string | null;
          phone_number?: string | null;
          caller_phone?: string | null;
          direction?: 'inbound' | 'outbound';
          status?: 'active' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'no-answer';
          duration_seconds?: number | null;
          started_at?: string;
          ended_at?: string | null;
          transcript?: Json | null;
          summary?: string | null;
          sentiment?: 'positive' | 'neutral' | 'negative' | null;
          intent?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          reservation_id?: string | null;
          order_id?: string | null;
          recording_url?: string | null;
          language_detected?: string | null;
          language_segments?: Json | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chat_sessions: {
        Row: {
          id: string;
          restaurant_id: string;
          customer_id: string | null;
          session_token: string;
          status: 'active' | 'closed';
          source: 'website' | 'widget';
          started_at: string;
          ended_at: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          customer_id?: string | null;
          session_token: string;
          status?: 'active' | 'closed';
          source?: 'website' | 'widget';
          started_at?: string;
          ended_at?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          customer_id?: string | null;
          session_token?: string;
          status?: 'active' | 'closed';
          source?: 'website' | 'widget';
          started_at?: string;
          ended_at?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          session_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          role?: 'user' | 'assistant' | 'system';
          content?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      plan_configs: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          description: string | null;
          price_eur: number | null; // Nullable for Enterprise "Contact Us" pricing
          price_interval: 'month' | 'year';
          location_limit: number;
          minute_limit: number;
          features: Json;
          stripe_price_id: string | null;
          stripe_product_id: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          display_name: string;
          description?: string | null;
          price_eur?: number | null;
          price_interval?: 'month' | 'year';
          location_limit?: number;
          minute_limit?: number;
          features?: Json;
          stripe_price_id?: string | null;
          stripe_product_id?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          display_name?: string;
          description?: string | null;
          price_eur?: number | null;
          price_interval?: 'month' | 'year';
          location_limit?: number;
          minute_limit?: number;
          features?: Json;
          stripe_price_id?: string | null;
          stripe_product_id?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string | null;
          plan_id: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscription_status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';
          voice_minutes_used: number;
          voice_minutes_reset_at: string;
          billing_email: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug?: string | null;
          plan_id?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';
          voice_minutes_used?: number;
          voice_minutes_reset_at?: string;
          billing_email?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          slug?: string | null;
          plan_id?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';
          voice_minutes_used?: number;
          voice_minutes_reset_at?: string;
          billing_email?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'manager' | 'viewer';
          invited_by: string | null;
          invited_at: string | null;
          joined_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: 'owner' | 'admin' | 'manager' | 'viewer';
          invited_by?: string | null;
          invited_at?: string | null;
          joined_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: 'owner' | 'admin' | 'manager' | 'viewer';
          invited_by?: string | null;
          invited_at?: string | null;
          joined_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      billing_alerts: {
        Row: {
          id: string;
          organization_id: string;
          alert_type: 'payment_failed' | 'subscription_canceled' | 'subscription_past_due' | 'approaching_limit' | 'limit_reached' | 'subscription_renewed';
          severity: 'info' | 'warning' | 'error';
          title: string;
          message: string;
          stripe_event_id: string | null;
          stripe_invoice_id: string | null;
          amount_due: number | null;
          currency: string;
          metadata: Json;
          acknowledged_at: string | null;
          acknowledged_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          alert_type: 'payment_failed' | 'subscription_canceled' | 'subscription_past_due' | 'approaching_limit' | 'limit_reached' | 'subscription_renewed';
          severity?: 'info' | 'warning' | 'error';
          title: string;
          message: string;
          stripe_event_id?: string | null;
          stripe_invoice_id?: string | null;
          amount_due?: number | null;
          currency?: string;
          metadata?: Json;
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          alert_type?: 'payment_failed' | 'subscription_canceled' | 'subscription_past_due' | 'approaching_limit' | 'limit_reached' | 'subscription_renewed';
          severity?: 'info' | 'warning' | 'error';
          title?: string;
          message?: string;
          stripe_event_id?: string | null;
          stripe_invoice_id?: string | null;
          amount_due?: number | null;
          currency?: string;
          metadata?: Json;
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_voice_minutes: {
        Args: {
          p_organization_id: string;
          p_minutes: number;
        };
        Returns: undefined;
      };
      reset_monthly_voice_minutes: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      create_billing_alert: {
        Args: {
          p_organization_id: string;
          p_alert_type: string;
          p_severity: string;
          p_title: string;
          p_message: string;
          p_stripe_event_id?: string;
          p_stripe_invoice_id?: string;
          p_amount_due?: number;
          p_metadata?: Json;
        };
        Returns: string;
      };
    };
    Enums: {
      member_role: 'owner' | 'admin' | 'manager' | 'staff';
      reservation_status: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
      order_status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
      order_type: 'dine_in' | 'takeout' | 'delivery';
      interaction_source: 'phone' | 'chat' | 'website' | 'walk_in' | 'manual';
      call_direction: 'inbound' | 'outbound';
      call_status: 'active' | 'initiated' | 'ringing' | 'in_progress' | 'completed' | 'failed' | 'no_answer';
      sentiment_type: 'positive' | 'neutral' | 'negative';
      payment_status: 'pending' | 'paid' | 'refunded';
      chat_role: 'user' | 'assistant' | 'system';
    };
    CompositeTypes: Record<string, never>;
  };
};

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];

// Convenience type aliases
export type Profile = Tables<'profiles'>;
export type Restaurant = Tables<'restaurants'>;
export type RestaurantMember = Tables<'restaurant_members'>;
export type MenuCategory = Tables<'menu_categories'>;
export type MenuItem = Tables<'menu_items'>;
export type Customer = Tables<'customers'>;
export type Reservation = Tables<'reservations'>;
export type Order = Tables<'orders'>;
export type CallLog = Tables<'call_logs'>;
export type ChatSession = Tables<'chat_sessions'>;
export type ChatMessage = Tables<'chat_messages'>;
export type PlanConfig = Tables<'plan_configs'>;
export type Organization = Tables<'organizations'>;
export type OrganizationMember = Tables<'organization_members'>;
export type BillingAlert = Tables<'billing_alerts'>;
