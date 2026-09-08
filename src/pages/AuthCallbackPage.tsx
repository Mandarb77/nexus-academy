/*
 * OAuth redirect handler (`/auth/callback`)
 *
 * PKCE lands here with `?code=`. Exchange happens only on this page
 * (`detectSessionInUrl` is off on the client). Do not wait for `getSession` /
 * `authReady` first — a hung restore would sit on “Finishing sign-in…” until the
 * code expired.
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { isSupabaseConfigured, supabase, supabaseUrl } from '../lib/supabase'
import { exchangeCodeWithPkceBackups, pkceVerifierStorageKey } from '../lib/pkceVerifierBackup'

export function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isSupabaseConfigured) {
      navigate('/', { replace: true })
      return
    }

    let cancelled = false
    void (async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      if (code) {
        const { data, error } = await exchangeCodeWithPkceBackups(
          (authCode) => supabase.auth.exchangeCodeForSession(authCode),
          code,
          pkceVerifierStorageKey(supabaseUrl),
        )
        if (cancelled) return
        if (data?.session) {
          navigate('/', { replace: true })
          return
        }
        if (error) {
          navigate(
            `/?error=invalid_request&error_code=bad_oauth_state&error_description=${encodeURIComponent(error.message)}`,
            { replace: true },
          )
          return
        }
      }

      if (params.get('error') || params.get('error_code') || params.get('error_description')) {
        navigate(`/?${params.toString()}`, { replace: true })
        return
      }

      navigate('/', { replace: true })
    })()

    return () => {
      cancelled = true
    }
  }, [navigate])

  return (
    <div className="app-shell">
      <p className="muted">Finishing sign-in…</p>
    </div>
  )
}
