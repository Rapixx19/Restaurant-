import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * DEBUG ENDPOINT - Remove in production
 * Tests Supabase connection and diagnoses issues
 */
export async function GET() {
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    checks: {},
  };

  try {
    // 1. Check environment variables
    diagnostics.env = {
      SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
      SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?
        `SET (${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...)` : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?
        `SET (${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...)` : 'MISSING',
    };

    // 2. Create Supabase client
    const supabase = await createClient();
    (diagnostics.checks as Record<string, unknown>).clientCreated = true;

    // 3. Test auth - get current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    (diagnostics.checks as Record<string, unknown>).session = {
      hasSession: !!sessionData?.session,
      userId: sessionData?.session?.user?.id || null,
      userEmail: sessionData?.session?.user?.email || null,
      error: sessionError ? {
        message: sessionError.message,
        status: sessionError.status,
        code: sessionError.code,
      } : null,
    };

    // 4. Test auth - get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    (diagnostics.checks as Record<string, unknown>).user = {
      hasUser: !!userData?.user,
      userId: userData?.user?.id || null,
      userEmail: userData?.user?.email || null,
      error: userError ? {
        message: userError.message,
        status: userError.status,
        code: userError.code,
      } : null,
    };

    // 5. Test database connection - simple query
    const { data: dbTest, error: dbError } = await (supabase as any)
      .from('restaurants')
      .select('id')
      .limit(1);

    (diagnostics.checks as Record<string, unknown>).database = {
      canQuery: !dbError,
      rowCount: dbTest?.length ?? 0,
      error: dbError ? {
        message: dbError.message,
        code: dbError.code,
        details: dbError.details,
        hint: dbError.hint,
      } : null,
    };

    // 6. Schema check skipped (no RPC function)

    // 7. Try to insert a test record (will rollback)
    if (userData?.user?.id) {
      const testInsert = {
        owner_id: userData.user.id,
        name: '__DEBUG_TEST__',
        slug: '__debug-test-' + Date.now(),
        timezone: 'America/New_York',
        settings: {},
      };

      const { error: insertError } = await (supabase as any)
        .from('restaurants')
        .insert(testInsert);

      (diagnostics.checks as Record<string, unknown>).insertTest = {
        attempted: true,
        testData: testInsert,
        error: insertError ? {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
        } : 'SUCCESS - would have inserted (check if __DEBUG_TEST__ exists)',
      };

      // Clean up if insert succeeded
      if (!insertError) {
        await (supabase as any)
          .from('restaurants')
          .delete()
          .eq('slug', testInsert.slug);
        (diagnostics.checks as Record<string, unknown>).insertTest = {
          ...(diagnostics.checks as Record<string, unknown>).insertTest as Record<string, unknown>,
          cleanup: 'Test row deleted',
        };
      }
    } else {
      (diagnostics.checks as Record<string, unknown>).insertTest = {
        attempted: false,
        reason: 'No authenticated user',
      };
    }

    // 8. Check if user profile exists (foreign key requirement)
    if (userData?.user?.id) {
      const { data: profileData, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('id, email')
        .eq('id', userData.user.id)
        .single();

      (diagnostics.checks as Record<string, unknown>).profile = {
        exists: !!profileData,
        data: profileData,
        error: profileError ? {
          message: profileError.message,
          code: profileError.code,
          details: profileError.details,
          hint: profileError.hint,
        } : null,
        note: 'restaurants.owner_id references profiles.id - profile MUST exist',
      };
    }

    // 9. Check RLS policies (requires service role)
    (diagnostics.checks as Record<string, unknown>).rlsNote =
      'If insert fails with permission error, RLS policies may be blocking. ' +
      'Check that INSERT policy exists for authenticated users on restaurants table.';

    return NextResponse.json(diagnostics, { status: 200 });

  } catch (error) {
    diagnostics.fatalError = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };
    return NextResponse.json(diagnostics, { status: 500 });
  }
}
