// =====================================================
// BUDDY BATTLE - Shared Server Auth Utility
// Used by all buddy-battle API routes
// =====================================================

import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

export const isAdminKeyAvailable =
  !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY !== supabaseAnonKey;

/**
 * Create an SSR-aware Supabase client (reads session from HTTP cookies)
 */
export async function createSSRClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignore - can fail in read-only contexts
        }
      },
    },
  });
}

/**
 * Create an admin Supabase client (bypasses RLS with service role key)
 */
export function createAdminClient() {
  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

/**
 * Decode JWT payload locally without calling Supabase.
 * Used as a fallback when the server can't reach Supabase's auth API.
 */
function decodeJwtPayload(
  token: string
): { sub?: string; email?: string; exp?: number; role?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Decode base64url payload
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));

    // Check if token is expired
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      console.warn('[buddy-battle/auth] JWT token is expired (local decode)');
      return null;
    }

    return payload;
  } catch (e) {
    console.warn('[buddy-battle/auth] JWT decode failed:', e);
    return null;
  }
}

export interface AuthResult {
  user: { id: string; email?: string; [key: string]: any } | null;
  supabase: any;
  adminClient: any;
}

/**
 * Get the authenticated user from the request.
 *
 * Tries three approaches in order:
 * 1. SSR cookies (Supabase session cookies set by middleware/SSR client)
 * 2. Authorization header (Bearer token validated with Supabase auth API)
 * 3. JWT local decode (extracts user ID from JWT payload without server call)
 *
 * The third fallback ensures auth works even when the server can't reach Supabase
 * (e.g., intermittent network issues, DNS failures, corporate proxies).
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthResult> {
  const adminClient = createAdminClient();

  // 1. Try SSR cookies approach
  let supabase: any;
  try {
    supabase = await createSSRClient();
  } catch (e) {
    console.warn('[buddy-battle/auth] Failed to create SSR client:', e);
    // Create a minimal client for the return value
    supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });
    // Skip to auth header check
    return tryAuthHeaderAndFallback(request, supabase, adminClient);
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    console.log('[buddy-battle/auth] SSR cookie check:', {
      hasUser: !!user,
      userId: user?.id,
      error: error?.message,
    });

    if (user) {
      return { user, supabase, adminClient };
    }
  } catch (e: any) {
    console.warn('[buddy-battle/auth] SSR cookie auth threw:', e?.message || e);
  }

  // 2 & 3. Try auth header, then JWT decode fallback
  return tryAuthHeaderAndFallback(request, supabase, adminClient);
}

async function tryAuthHeaderAndFallback(
  request: NextRequest,
  supabase: any,
  adminClient: any
): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);

    // Always prepare a token-bound client so fallback paths still have authenticated DB access.
    const supabaseWithToken = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: { persistSession: false },
    });

    // 2. Try validating token with Supabase auth API
    try {
      const {
        data: { user: tokenUser },
        error: tokenError,
      } = await supabaseWithToken.auth.getUser(token);

      console.log('[buddy-battle/auth] Token verification:', {
        hasUser: !!tokenUser,
        userId: tokenUser?.id,
        error: tokenError?.message,
      });

      if (tokenUser) {
        return { user: tokenUser, supabase: supabaseWithToken as any, adminClient };
      }
    } catch (e: any) {
      console.warn(
        '[buddy-battle/auth] Token verification threw (Supabase unreachable?):',
        e?.message || e
      );
    }

    // 3. Fallback: decode JWT locally
    // This works even when the server can't reach Supabase's auth API
    const payload = decodeJwtPayload(token);
    if (payload?.sub) {
      console.log('[buddy-battle/auth] Using JWT local decode fallback:', {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      });

      const userFallback = {
        id: payload.sub,
        email: payload.email || '',
        role: payload.role || 'authenticated',
      };

      return { user: userFallback as any, supabase: supabaseWithToken as any, adminClient };
    }
  }

  console.log('[buddy-battle/auth] No authenticated user found');
  return { user: null, supabase, adminClient };
}
