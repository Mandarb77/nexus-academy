/*
 * Google OAuth start — isolated from session restore.
 *
 * The main supabase client serializes getSession/refresh behind a lock. Login
 * must not wait on that. This client shares PKCE storage so the callback can
 * exchange the code, but it does not take the auth lock.
 *
 * Let supabase-js navigate. skipBrowserRedirect left people sitting on the
 * /auth/v1/authorize URL, which looks like a broken supabase.co page.
 */

import { getSupabaseOAuth, isSupabaseConfigured } from './supabase'

export async function startGoogleOAuth(): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured')
  }

  const redirectTo = `${window.location.origin}/auth/callback`
  const { error } = await getSupabaseOAuth().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        prompt: 'select_account',
      },
    },
  })

  if (error) throw error
}
