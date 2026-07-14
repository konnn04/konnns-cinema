import { NextRequest, NextResponse } from 'next/server';
import { GATE_API_PATH, GATE_DENIED_PATH, GATE_ENTRY_PATH, SITE_AUTH_COOKIE, isGateEnabled, verifyAuthCookieValue } from '@/lib/siteAuth';

// Site-wide password gate. Every route is blocked behind a generic "no
// permission" page (rewritten in place, URL unchanged) until the visitor
// authenticates at /access -- see lib/siteAuth.ts for the crypto and
// app/api/site-auth for the verify/rate-limit endpoint this all depends on.
export async function proxy(request: NextRequest) {
  if (!isGateEnabled()) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname === GATE_ENTRY_PATH || pathname === GATE_API_PATH || pathname === GATE_DENIED_PATH) {
    return NextResponse.next();
  }

  const authorized = await verifyAuthCookieValue(process.env.PASSWORD!, request.cookies.get(SITE_AUTH_COOKIE)?.value);
  if (authorized) return NextResponse.next();

  return NextResponse.rewrite(new URL(GATE_DENIED_PATH, request.url));
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
