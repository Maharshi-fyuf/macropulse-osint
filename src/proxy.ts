import { NextRequest, NextResponse } from 'next/server';

// Routes that require authentication (add protected paths here as the app grows)
const PROTECTED_PATHS: string[] = [
  // e.g. '/admin', '/dashboard/settings'
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Clone the response so we can add headers
  const response = NextResponse.next();

  // ── Security Headers ────────────────────────────────────────────────────────
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME-type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Force HTTPS for 1 year, include subdomains
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  // Disable browser caching of potentially sensitive API responses
  if (pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, max-age=0');
  }

  // Referrer Policy — don't leak the full URL to external domains
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy — disable browser APIs not used by this app
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // Content Security Policy — restrict sources to known safe origins
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      // TradingView widgets require their own origin for iframes & scripts
      "script-src 'self' 'unsafe-inline' https://s3.tradingview.com https://static.tradingview.com",
      "frame-src 'self' https://s3.tradingview.com https://www.tradingview.com",
      "img-src 'self' data: https://s3.tradingview.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    ].join('; ')
  );

  // ── Route Protection ─────────────────────────────────────────────────────────
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (isProtected) {
    // Placeholder: redirect to home if no session cookie is found.
    // Swap this for a real session check (e.g. Supabase session cookie) when auth is added.
    const sessionCookie = request.cookies.get('sb-access-token');
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return response;
}

export const config = {
  // Apply proxy to all routes EXCEPT Next.js internals and static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
