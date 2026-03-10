/**
 * OPDS HTTP Basic Auth helper
 *
 * Validates Basic Auth credentials against the users table.
 * Called from OPDS route handlers (not middleware, since middleware
 * runs in Edge runtime which doesn't support bcryptjs).
 */

import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

const UNAUTHORIZED = () => new NextResponse('Unauthorized', {
  status: 401,
  headers: {
    'WWW-Authenticate': 'Basic realm="Longbox OPDS"',
  },
});

/**
 * Validate OPDS Basic Auth and return the user ID.
 * Returns a 401 NextResponse if auth fails.
 */
export async function validateOPDSAuth(
  request: NextRequest
): Promise<{ userId: string } | NextResponse> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Basic ')) {
    return UNAUTHORIZED();
  }

  const base64 = authHeader.slice(6);
  let decoded: string;
  try {
    decoded = atob(base64);
  } catch {
    return UNAUTHORIZED();
  }

  const colonIndex = decoded.indexOf(':');
  if (colonIndex === -1) {
    return UNAUTHORIZED();
  }

  const email = decoded.slice(0, colonIndex);
  const password = decoded.slice(colonIndex + 1);

  if (!email || !password) {
    return UNAUTHORIZED();
  }

  // Try email lookup first, then username/name lookup
  let [user] = await db
    .select({ id: users.id, password: users.password, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // If no match by email, try by name (some OPDS clients send username, not email)
  if (!user) {
    [user] = await db
      .select({ id: users.id, password: users.password, email: users.email })
      .from(users)
      .where(eq(users.name, email))
      .limit(1);
  }

  if (!user) {
    console.log('[OPDS Auth] No user found for:', email);
    return UNAUTHORIZED();
  }

  if (!user.password) {
    console.log('[OPDS Auth] User has no password (OAuth-only account):', email);
    return UNAUTHORIZED();
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    console.log('[OPDS Auth] Invalid password for:', email);
    return UNAUTHORIZED();
  }

  return { userId: user.id };
}
