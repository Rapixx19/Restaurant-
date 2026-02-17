import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Protected routes that require authentication.
 */
const PROTECTED_ROUTES = ['/dashboard', '/onboarding'];

/**
 * Auth routes that should redirect to dashboard if already authenticated.
 */
const AUTH_ROUTES = ['/login', '/signup'];

/**
 * Widget routes that allow iframe embedding.
 */
const WIDGET_ROUTES = ['/widget'];

/**
 * Middleware for session management and route protection.
 *
 * Rules:
 * 1. Refresh session on every request
 * 2. Redirect unauthenticated users from /dashboard/* to /login
 * 3. Redirect authenticated users from /login or /signup to /dashboard
 * 4. Pass pathname header to server components
 */
export async function middleware(request: NextRequest) {
  const { user, supabaseResponse } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Add pathname header for server components
  supabaseResponse.headers.set('x-pathname', pathname);

  // Check if the current path is a widget route (allow iframe embedding)
  const isWidgetRoute = WIDGET_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Set headers to allow iframe embedding for widget routes
  if (isWidgetRoute) {
    supabaseResponse.headers.set('X-Frame-Options', 'ALLOWALL');
    supabaseResponse.headers.set('Content-Security-Policy', "frame-ancestors *");
    return supabaseResponse;
  }

  // Check if the current path is a protected route
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Check if the current path is an auth route
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route);

  // Redirect unauthenticated users from protected routes to login
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users from auth routes
  // Note: Layout will check for restaurants and redirect to /onboarding if needed
  if (isAuthRoute && user) {
    const redirectTo = request.nextUrl.searchParams.get('redirect') || '/dashboard';
    // Safety: Never redirect back to auth routes to avoid loops
    const safeRedirect = redirectTo.startsWith('/login') || redirectTo.startsWith('/signup')
      ? '/dashboard'
      : redirectTo;
    return NextResponse.redirect(new URL(safeRedirect, request.url));
  }

  return supabaseResponse;
}

/**
 * Matcher configuration for middleware.
 * Excludes static files, API routes, and other non-page routes.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     * - api routes that don't need auth
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
