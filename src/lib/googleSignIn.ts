/*
 * Google OAuth start — isolated from session restore.
 *
 * Kids must not sit on ezjjehppuefzzromlbrk.supabase.co (looks broken; some school
 * filters stall there). We ask GoTrue for the authorize URL, then open it on *this*
 * origin. Vercel/Vite proxy `/auth/v1` to Supabase, which 302s to Google.
 */

import { getSupabaseOAuth, isSupabaseConfigured } from './supabase'

export function authUrlOnThisSite(raw: string): string {
  const parsed = new URL(raw)
  if (!parsed.pathname.startsWith('/auth/v1/')) return raw
  parsed.protocol = window.location.protocol
  parsed.host = window.location.host
  return parsed.toString()
}

export async function startGoogleOAuth(options?: { pickAccount?: boolean }): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured')
  }

  const redirectTo = `${window.location.origin}/auth/callback`
  const queryParams: Record<string, string> = {}
  if (options?.pickAccount) queryParams.prompt = 'select_account'

  const { data, error } = await getSupabaseOAuth().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      ...(Object.keys(queryParams).length > 0 ? { queryParams } : {}),
    },
  })

  if (error) throw error
  const url = data?.url
  if (!url) throw new Error('Google did not return a sign-in link.')

  window.location.assign(authUrlOnThisSite(url))
}
