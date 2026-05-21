/**
 * Next.js 16 Middleware — route protection.
 * Runs on the Edge Runtime before every request.
 * Reference: node_modules/next/dist/docs/01-app/02-guides/authentication.md
 */
import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/session';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/signup', '/reset-password'];
const PUBLIC_PREFIXES = ['/api/auth'];

// Admin-only routes
const ADMIN_ROUTES = ['/admin'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static assets / Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const isPublicRoute =
    PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + '?')) ||
    PUBLIC_PREFIXES.some(p => pathname.startsWith(p));

  // Read and verify session cookie
  const sessionCookie = request.cookies.get('athena_session')?.value;
  const session = await decrypt(sessionCookie);
  const isAuthenticated = !!session;

  // Redirect unauthenticated users to login
  if (!isAuthenticated && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && PUBLIC_ROUTES.some(r => pathname === r)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Protect admin routes — role must be 'admin'
  const isAdminRoute = ADMIN_ROUTES.some(r => pathname.startsWith(r));
  if (isAdminRoute && session?.role !== 'admin') {
    return NextResponse.redirect(new URL('/?access=denied', request.url));
  }

  // Inject workspace context into request headers for downstream API routes
  const response = NextResponse.next();
  if (session) {
    response.headers.set('x-user-id', session.userId);
    response.headers.set('x-user-role', session.role);
    response.headers.set('x-workspace-id', session.workspaceId);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
