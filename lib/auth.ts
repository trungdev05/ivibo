/**
 * lib/auth.ts
 * Auth utilities for mock authentication.
 * Uses Web Crypto API (HMAC-SHA256) — compatible with Edge and Node.js runtimes.
 */
import type { User } from '@/lib/platform-types';

// ── Secret ────────────────────────────────────────────────────────────────────
const SECRET = process.env.AUTH_SECRET ?? 'omes-dev-secret-change-in-production';

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

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Mock credential store ─────────────────────────────────────────────────────
// password: "password123" for all accounts (demo only)
export const AUTH_USERS: Array<Omit<User, 'createdAt' | 'updatedAt'> & { password: string }> = [
  {
    id: 'u1',
    email: 'admin@omes.vn',
    fullName: 'Admin User',
    globalRole: 'super_admin',
    isActive: true,
    password: 'admin123',
  },
  {
    id: 'u2',
    email: 'dung@company.com',
    fullName: 'Mr Dũng',
    globalRole: 'manager',
    isActive: true,
    password: 'password123',
  },
  {
    id: 'u3',
    email: 'trang@company.com',
    fullName: 'Ms Trang',
    globalRole: 'employee',
    isActive: true,
    password: 'password123',
  },
  {
    id: 'u4',
    email: 'khoa@company.com',
    fullName: 'Mr Khoa',
    globalRole: 'employee',
    isActive: true,
    password: 'password123',
  },
  {
    id: 'u5',
    email: 'vy@company.com',
    fullName: 'Ms Vy',
    globalRole: 'employee',
    isActive: true,
    password: 'password123',
  },
];

// ── Token helpers ─────────────────────────────────────────────────────────────

export async function createToken(userId: string): Promise<string> {
  const enc = new TextEncoder();
  const payload = btoa(userId).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const key = await getSecretKey(SECRET);
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  const sig = toHex(sigBuf);
  return `${payload}.${sig}`;
}

export async function verifyToken(token: string): Promise<string | null> {
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

// ── User lookup ───────────────────────────────────────────────────────────────

export function findUserByCredentials(email: string, password: string) {
  const user = AUTH_USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
  );
  if (!user) return null;
  const { password: _pw, ...safe } = user;
  return {
    ...safe,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  } as User;
}

export function findUserById(id: string): User | null {
  const user = AUTH_USERS.find((u) => u.id === id);
  if (!user) return null;
  const { password: _pw, ...safe } = user;
  return {
    ...safe,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  } as User;
}

// ── Cookie name ───────────────────────────────────────────────────────────────
export const SESSION_COOKIE = 'omes_session';
