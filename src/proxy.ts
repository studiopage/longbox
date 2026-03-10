import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

// Routes that don't require authentication
const publicRoutes = ['/login', '/signup', '/api/auth'];

// Routes that are always accessible (static assets, etc.)
const alwaysAccessible = ['/_next', '/favicon.ico', '/api/auth', '/api/opds'];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow static assets and auth API
  if (alwaysAccessible.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // If user is not authenticated and route is not public, redirect to login
  if (!req.auth && !isPublicRoute) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user is authenticated and trying to access login/signup, redirect to home
  if (req.auth && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.html$).*)',
  ],
};
