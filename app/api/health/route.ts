import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Health check endpoint for container orchestration.
 * Verifies application is running and database is reachable.
 */
export async function GET() {
  const checks: Record<string, 'ok' | 'error'> = {
    app: 'ok',
    database: 'error',
  };

  // Check database connectivity
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });

      // Simple query to verify connection
      const { error } = await supabase
        .from('restaurants')
        .select('id')
        .limit(1);

      if (!error) {
        checks.database = 'ok';
      }
    }
  } catch {
    // Database check failed, status remains 'error'
  }

  const allHealthy = Object.values(checks).every((status) => status === 'ok');

  return NextResponse.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allHealthy ? 200 : 503 }
  );
}
