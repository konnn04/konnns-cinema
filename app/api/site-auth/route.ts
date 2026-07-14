import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_COOKIE_MAX_AGE_SECONDS, RATE_LIMIT_COOKIE, RATE_LIMIT_COOKIE_MAX_AGE_SECONDS,
  SITE_AUTH_COOKIE, createAuthCookieValue, isGateEnabled, readRateLimitState, recordFailure,
  remainingLockMs, signRateLimitState,
} from '@/lib/siteAuth';

const isProd = process.env.NODE_ENV === 'production';

export async function GET(request: NextRequest) {
  if (!isGateEnabled()) return NextResponse.json({ locked: false, lockedUntil: 0 });

  const state = await readRateLimitState(process.env.PASSWORD!, request.cookies.get(RATE_LIMIT_COOKIE)?.value);
  return NextResponse.json({ locked: remainingLockMs(state) > 0, lockedUntil: state.lockedUntil });
}

export async function POST(request: NextRequest) {
  if (!isGateEnabled()) return NextResponse.json({ ok: true });
  const password = process.env.PASSWORD!;

  let code = '';
  try {
    const body = await request.json();
    code = typeof body?.code === 'string' ? body.code : '';
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const state = await readRateLimitState(password, request.cookies.get(RATE_LIMIT_COOKIE)?.value);
  if (remainingLockMs(state) > 0) {
    return NextResponse.json({ ok: false, locked: true, lockedUntil: state.lockedUntil });
  }

  if (code === password) {
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SITE_AUTH_COOKIE, await createAuthCookieValue(password), {
      httpOnly: true, sameSite: 'lax', secure: isProd, maxAge: AUTH_COOKIE_MAX_AGE_SECONDS, path: '/',
    });
    response.cookies.set(RATE_LIMIT_COOKIE, '', { maxAge: 0, path: '/' });
    return response;
  }

  const nextState = recordFailure(state);
  const response = NextResponse.json({ ok: false, locked: remainingLockMs(nextState) > 0, lockedUntil: nextState.lockedUntil });
  response.cookies.set(RATE_LIMIT_COOKIE, await signRateLimitState(password, nextState), {
    httpOnly: true, sameSite: 'lax', secure: isProd, maxAge: RATE_LIMIT_COOKIE_MAX_AGE_SECONDS, path: '/',
  });
  return response;
}
