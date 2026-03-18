// =====================================================
// BUDDY BATTLE - Shared Client Auth Headers
// Used by all buddy-battle client components for API calls
// =====================================================

import { supabase } from '@/lib/supabase';

/**
 * Get auth headers for buddy-battle API calls.
 * Tries existing session first, falls back to refresh if no access token available.
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  // Try existing session first
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
  }

  // Try refreshing session if no access token found
  try {
    const { data: refreshData } = await supabase.auth.refreshSession();
    if (refreshData.session?.access_token) {
      return {
        'Authorization': `Bearer ${refreshData.session.access_token}`,
        'Content-Type': 'application/json',
      };
    }
  } catch (e) {
    console.warn('[buddy-battle/client-auth] Session refresh failed:', e);
  }

  return {
    'Content-Type': 'application/json',
  };
}
