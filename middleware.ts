/**
 * Vercel Edge Middleware — Global rate limiting for API routes.
 *
 * Runs BEFORE serverless functions at the edge (CDN level).
 * Counts requests per IP using a sliding-window approach stored
 * in a WeakMap on the Edge Runtime's global object.
 *
 * Limits:
 *   - /api/login  →  5 req / 15 min per IP
 *   - /api/*      → 100 req / 60 s  per IP
 *   - everything else passes through
 */

const LOGIN_RATE = { max: 5, windowMs: 15 * 60 * 1000 };
const GLOBAL_RATE = { max: 100, windowMs: 60 * 1000 };

// Sliding-window counter stored per-IP. The Edge runtime keeps
// the global object warm across invocations on the same region,
// but does NOT guarantee cross-region consistency.
// For a distributed shop, replace with Upstash Redis KV.

const store = (() => {
  if (!('__rateLimit' in globalThis)) (globalThis as any).__rateLimit = new Map();
  return (globalThis as any).__rateLimit as Map<string, { hits: number; resetAt: number }>;
})();

function getClientIP(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '0.0.0.0';
}

function isRateLimited(
  ip: string,
  pathname: string,
): { limited: boolean; retryAfter: number } | null {
  const now = Date.now();
  const key = `${ip}:${pathname}`;
  let entry = store.get(key);

  // Determine rate based on route
  const isLogin = pathname === '/api/login';
  const rate = isLogin ? LOGIN_RATE : GLOBAL_RATE;

  if (!entry || now > entry.resetAt) {
    entry = { hits: 1, resetAt: now + rate.windowMs };
    store.set(key, entry);
    return null; // not limited
  }

  entry.hits++;

  if (entry.hits > rate.max) {
    return { limited: true, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  return null;
}

// Periodic cleanup: remove expired entries every 5 min
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = 0;

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}

export default function middleware(request: Request) {
  const url = new URL(request.url);
  const { pathname } = url;

  // Only rate-limit API routes
  if (!pathname.startsWith('/api/')) return;

  cleanup();

  const ip = getClientIP(request);
  const result = isRateLimited(ip, pathname);

  if (result?.limited) {
    return new Response(
      JSON.stringify({ error: 'Demasiadas solicitudes. Intente de nuevo más tarde.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(result.retryAfter),
          'X-RateLimit-IP': ip,
        },
      }
    );
  }
}

export const config = {
  matcher: '/api/:path*',
};
