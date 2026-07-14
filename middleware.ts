import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthCookieValue } from '@/lib/siteAuth';
import { SITE_AUTH_COOKIE, GATE_DENIED_PATH } from '@/lib/siteAuth';

const password = process.env.PASSWORD;

const CRAWLER_UA = /facebookexternalhit|twitterbot|discordbot|slack|telegram|linkedin|whatsapp|slack|skype|googlebot/i;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/access') ||
    pathname.startsWith('/favicon') ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  const ua = request.headers.get('user-agent') || '';
  if (CRAWLER_UA.test(ua)) {
    return NextResponse.next();
  }

  if (password) {
    const cookie = request.cookies.get(SITE_AUTH_COOKIE)?.value;
    const authorized = await verifyAuthCookieValue(password, cookie);
    if (!authorized) {
      return NextResponse.redirect(new URL(GATE_DENIED_PATH, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
