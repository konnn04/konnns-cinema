export const SITE_AUTH_COOKIE = 'site_auth';
export const RATE_LIMIT_COOKIE = 'site_rl';
export const GATE_ENTRY_PATH = '/access';
export const GATE_API_PATH = '/api/site-auth';
export const GATE_DENIED_PATH = '/access-denied';

export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24;
export const RATE_LIMIT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24;

const RATE_LIMIT_TIERS = [
  { attempts: 10, lockMs: 10 * 60 * 1000 },
  { attempts: 5, lockMs: 60 * 1000 },
  { attempts: 3, lockMs: 30 * 1000 },
] as const;

const RATE_LIMIT_RESET_AFTER_MS = 24 * 60 * 60 * 1000;

export interface RateLimitState {
  failCount: number;
  lockedUntil: number;
  lastAttemptAt: number;
}

export const EMPTY_RATE_LIMIT_STATE: RateLimitState = { failCount: 0, lockedUntil: 0, lastAttemptAt: 0 };

export function isGateEnabled(): boolean {
  return !!process.env.PASSWORD;
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function toBase64Url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return atob(padded + pad);
}

// Derives a per-password signing secret rather than signing with the raw
// password, so the cookie itself never contains (or is derivable back into)
// the plaintext password.
function gateSecret(password: string): string {
  return `konnns-cinema-site-gate:${password}`;
}

export async function createAuthCookieValue(password: string): Promise<string> {
  return hmacHex(gateSecret(password), 'authorized');
}

export async function verifyAuthCookieValue(password: string, value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const expected = await createAuthCookieValue(password);
  return timingSafeEqual(value, expected);
}

export async function signRateLimitState(password: string, state: RateLimitState): Promise<string> {
  const payload = toBase64Url(JSON.stringify(state));
  const sig = await hmacHex(gateSecret(password), payload);
  return `${payload}.${sig}`;
}

export async function readRateLimitState(password: string, cookieValue: string | undefined): Promise<RateLimitState> {
  if (!cookieValue) return { ...EMPTY_RATE_LIMIT_STATE };
  const [payload, sig] = cookieValue.split('.');
  if (!payload || !sig) return { ...EMPTY_RATE_LIMIT_STATE };

  const expectedSig = await hmacHex(gateSecret(password), payload);
  if (!timingSafeEqual(sig, expectedSig)) return { ...EMPTY_RATE_LIMIT_STATE };

  try {
    const state = JSON.parse(fromBase64Url(payload)) as RateLimitState;
    if (typeof state.failCount !== 'number' || typeof state.lockedUntil !== 'number' || typeof state.lastAttemptAt !== 'number') {
      return { ...EMPTY_RATE_LIMIT_STATE };
    }
    if (Date.now() - state.lastAttemptAt > RATE_LIMIT_RESET_AFTER_MS) return { ...EMPTY_RATE_LIMIT_STATE };
    return state;
  } catch {
    return { ...EMPTY_RATE_LIMIT_STATE };
  }
}

function computeLockMs(failCount: number): number {
  for (const tier of RATE_LIMIT_TIERS) {
    if (failCount >= tier.attempts) return tier.lockMs;
  }
  return 0;
}

export function recordFailure(state: RateLimitState): RateLimitState {
  const now = Date.now();
  const failCount = state.failCount + 1;
  const lockMs = computeLockMs(failCount);
  return { failCount, lockedUntil: lockMs > 0 ? now + lockMs : state.lockedUntil, lastAttemptAt: now };
}

export function remainingLockMs(state: RateLimitState): number {
  return Math.max(0, state.lockedUntil - Date.now());
}
