'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

// Singleton instance to prevent multiple WebSocket connections
let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/**
 * Creates a Supabase client for use in Client Components.
 * Uses singleton pattern to prevent WebSocket connection issues.
 *
 * @example
 * 'use client';
 * import { createClient } from '@/lib/supabase/client';
 *
 * const supabase = createClient();
 * const { data } = await supabase.from('profiles').select();
 */
export function createClient() {
  // Runtime validation for env vars
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase environment variables are missing. Check your .env.local file.'
    );
  }

  // Singleton: return existing client if already created
  if (client) {
    console.log('✅ Reusing existing Supabase Singleton');
    return client;
  }
  console.log('🚀 Initializing NEW Supabase Singleton');

  client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  return client;
}
