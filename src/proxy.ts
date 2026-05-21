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
  const requestHeaders = new Headers(request.headers);
  if (session) {
    requestHeaders.set('x-user-id', session.userId);
    requestHeaders.set('x-user-role', session.role);
    
    // For standard users, lock the workspace strictly to their session's workspaceId
    // For admin users, allow them to override it if they specify a custom header or query param
    if (session.role === 'admin') {
      const customWorkspaceId = request.headers.get('x-workspace-id') || 
                                request.nextUrl.searchParams.get('workspaceId');
      if (customWorkspaceId) {
        requestHeaders.set('x-workspace-id', customWorkspaceId);
      } else {
        requestHeaders.set('x-workspace-id', session.workspaceId);
      }
    } else {
      requestHeaders.set('x-workspace-id', session.workspaceId);
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
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
