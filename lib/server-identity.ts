/**
 * lib/server-identity.ts
 * Server-side helper to resolve the current authenticated user from the session cookie.
 * Use in API route handlers (Node.js runtime only).
 */
import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifyToken, findUserById } from '@/lib/auth';
import { OMES_USERS } from '@/lib/omes-mock';

export interface CurrentUser {
  /** userId from AUTH_USERS (u1..u5 range for login accounts) */
  id: string;
  /** Display name matching assignee/owner/reporter strings in tasks & tickets */
  fullName: string;
  email: string;
  globalRole: string;
  department?: string;
  role?: string;
}

/**
 * Resolves the current user from the HTTP-only session cookie.
 * Returns null when unauthenticated or token invalid.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const userId = await verifyToken(token);
  if (!userId) return null;

  const user = findUserById(userId);
  if (!user) return null;

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    globalRole: user.globalRole,
    department: undefined,
    role: undefined,
  };
}

/**
 * Same as getCurrentUser but also looks up the matching OmesUser for richer data
 * (department, role title, etc.). Falls back to the auth user if no OMES record found.
 */
export async function getCurrentOmesUser(): Promise<CurrentUser | null> {
  const authUser = await getCurrentUser();
  if (!authUser) return null;

  // Try to find a matching OMES user by email to get the correct display name
  // (OMES_USERS and AUTH_USERS use the same emails but different IDs)
  const omesUser = OMES_USERS.find(
    (u) => u.email.toLowerCase() === authUser.email.toLowerCase(),
  );

  if (omesUser) {
    return {
      id: omesUser.id,
      fullName: omesUser.name, // e.g. 'Mr Dũng' — matches task assignee strings
      email: omesUser.email,
      globalRole: omesUser.globalRole,
      department: omesUser.department,
      role: omesUser.role,
    };
  }

  return authUser;
}
