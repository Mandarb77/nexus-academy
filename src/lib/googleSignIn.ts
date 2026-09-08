/*
 * Google OAuth start — isolated from session restore.
 *
 * The main supabase client serializes getSession/refresh behind a lock. Login
 * must not wait on that. This client shares PKCE storage so the callback can
 * exchange the code, but it does not take the auth lock.
 */

import { SCHOOL_EMAIL_DOMAIN } from './schoolEmail'
import { getSupabaseOAuth, isSupabaseConfigured, supabaseUrl } from './supabase'

const AUTHORIZE_MS = 12_000

export async function startGoogleOAuth(): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured')
  }

  const redirectTo = `${window.location.origin}/auth/callback`
  const { data, error } = await Promise.race([
    getSupabaseOAuth().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: {
          prompt: 'select_account',
          hd: SCHOOL_EMAIL_DOMAIN,
        },
      },
    }),
    new Promise<never>((_, reject) => {
      window.setTimeout(
        () => reject(new Error('Google sign-in timed out.')),
        AUTHORIZE_MS,
      )
    }),
  ])

  if (error) throw error
  const url = data?.url
  if (!url) throw new Error('Google did not return a sign-in link.')

  /* Keep PKCE on this origin; Site URL mismatches are handled by canonical host bounce. */
  if (!url.startsWith(supabaseUrl) && !url.includes('accounts.google.com')) {
    throw new Error('Unexpected sign-in URL.')
  }

  window.location.assign(url)
}
