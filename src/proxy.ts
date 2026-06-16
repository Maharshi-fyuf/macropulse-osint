import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PATHS: string[] = [];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // Security Headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  if (pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, max-age=0');
  }

  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval needed for some dev setups, adjust for strictly prod
      "frame-src 'self'",
      "img-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    ].join('; ')
  );

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (isProtected) {
    const sessionCookie = request.cookies.get('sb-access-token');
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
