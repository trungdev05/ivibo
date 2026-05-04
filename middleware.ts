import { NextRequest, NextResponse } from 'next/server';
import { MODULE_REGISTRY } from '@/lib/module-registry';

const SESSION_COOKIE = 'omes_session';
const SECRET = process.env.AUTH_SECRET ?? 'omes-dev-secret-change-in-production';

// Public paths that do NOT require authentication
const PUBLIC_PREFIXES = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/me',
  '/_next',
  '/favicon',
];

// All module page paths — derived from registry (no manual sync needed)
const MODULE_PAGE_PATHS = MODULE_REGISTRY.flatMap((m) => m.basePaths);

async function getSecretKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function verifyToken(token: string): Promise<string | null> {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  try {
    const key = await getSecretKey(SECRET);
    const enc = new TextEncoder();
    const sigBytes = Uint8Array.from(
      sig.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)),
    );
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(payload));
    if (!valid) return null;
    return atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const userId = token ? await verifyToken(token) : null;

  if (!userId) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  // Forward user identity to API routes via header
  const response = NextResponse.next();
  response.headers.set('x-user-id', userId);

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
