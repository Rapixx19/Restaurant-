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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
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
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
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
          date: string;
          time: string;
          duration_minutes: number;
          status: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
          source: 'phone' | 'chat' | 'website' | 'walk_in' | 'manual';
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
          date: string;
          time: string;
          duration_minutes?: number;
          status?: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
          source?: 'phone' | 'chat' | 'website' | 'walk_in' | 'manual';
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
          date?: string;
          time?: string;
          duration_minutes?: number;
          status?: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
          source?: 'phone' | 'chat' | 'website' | 'walk_in' | 'manual';
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
          vapi_call_id: string;
          customer_id: string | null;
          caller_phone: string;
          direction: 'inbound' | 'outbound';
          status: 'initiated' | 'ringing' | 'in_progress' | 'completed' | 'failed' | 'no_answer';
          duration_seconds: number | null;
          started_at: string;
          ended_at: string | null;
          transcript: Json | null;
          summary: string | null;
          sentiment: 'positive' | 'neutral' | 'negative' | null;
          intent: string | null;
          actions_taken: Json;
          recording_url: string | null;
          cost: number | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          vapi_call_id: string;
          customer_id?: string | null;
          caller_phone: string;
          direction?: 'inbound' | 'outbound';
          status?: 'initiated' | 'ringing' | 'in_progress' | 'completed' | 'failed' | 'no_answer';
          duration_seconds?: number | null;
          started_at?: string;
          ended_at?: string | null;
          transcript?: Json | null;
          summary?: string | null;
          sentiment?: 'positive' | 'neutral' | 'negative' | null;
          intent?: string | null;
          actions_taken?: Json;
          recording_url?: string | null;
          cost?: number | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          vapi_call_id?: string;
          customer_id?: string | null;
          caller_phone?: string;
          direction?: 'inbound' | 'outbound';
          status?: 'initiated' | 'ringing' | 'in_progress' | 'completed' | 'failed' | 'no_answer';
          duration_seconds?: number | null;
          started_at?: string;
          ended_at?: string | null;
          transcript?: Json | null;
          summary?: string | null;
          sentiment?: 'positive' | 'neutral' | 'negative' | null;
          intent?: string | null;
          actions_taken?: Json;
          recording_url?: string | null;
          cost?: number | null;
          metadata?: Json;
          created_at?: string;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      member_role: 'owner' | 'admin' | 'manager' | 'staff';
      reservation_status: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
      order_status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
      order_type: 'dine_in' | 'takeout' | 'delivery';
      interaction_source: 'phone' | 'chat' | 'website' | 'walk_in' | 'manual';
      call_direction: 'inbound' | 'outbound';
      call_status: 'initiated' | 'ringing' | 'in_progress' | 'completed' | 'failed' | 'no_answer';
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
