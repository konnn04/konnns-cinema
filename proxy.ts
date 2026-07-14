import { NextRequest, NextResponse } from 'next/server';
import { GATE_API_PATH, GATE_DENIED_PATH, GATE_ENTRY_PATH, SITE_AUTH_COOKIE, isGateEnabled, verifyAuthCookieValue } from '@/lib/siteAuth';

const CRAWLER_UA = /facebookexternalhit|twitterbot|discordbot|slack|telegram|linkedin|whatsapp|skype|googlebot|pinterest|slack-img|slack-preview/i;

export async function proxy(request: NextRequest) {
  if (!isGateEnabled()) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname === GATE_ENTRY_PATH || pathname === GATE_API_PATH || pathname === GATE_DENIED_PATH) {
    return NextResponse.next();
  }

  const ua = request.headers.get('user-agent') || '';
  if (CRAWLER_UA.test(ua)) {
    return NextResponse.next();
  }

  const authorized = await verifyAuthCookieValue(process.env.PASSWORD!, request.cookies.get(SITE_AUTH_COOKIE)?.value);
  if (authorized) return NextResponse.next();

  return NextResponse.rewrite(new URL(GATE_DENIED_PATH, request.url));
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
