import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  if (process.env.VERCEL_ENV !== 'production') return NextResponse.next();

  const canonicalHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (!canonicalHost) return NextResponse.next();

  const currentHost = request.headers.get('host')?.toLowerCase();
  if (!currentHost || currentHost === canonicalHost.toLowerCase()) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.protocol = 'https:';
  url.host = canonicalHost;
  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|pwa-icon).*)'],
};
