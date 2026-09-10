/*
 * OAuth redirect handler (`/auth/callback`)
 *
 * PKCE lands here with `?code=`. Exchange on the login client (no auth lock) so a
 * hung getSession cannot sit on “Finishing sign-in…” until the code expires.
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { isSupabaseConfigured, getSupabaseOAuth, supabaseUrl } from '../lib/supabase'
import { exchangeCodeWithPkceBackups, pkceVerifierStorageKey } from '../lib/pkceVerifierBackup'

const EXCHANGE_MS = 12_000

export function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isSupabaseConfigured) {
      navigate('/', { replace: true })
      return
    }

    let cancelled = false
    const failHome = (code: string, message: string) => {
      if (cancelled) return
      navigate(
        `/?error=invalid_request&error_code=${encodeURIComponent(code)}&error_description=${encodeURIComponent(message)}`,
        { replace: true },
      )
    }

    const watchdog = window.setTimeout(() => {
      failHome('oauth_timeout', 'Sign-in stalled. Click Google once more.')
    }, EXCHANGE_MS)

    void (async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      if (code) {
        const { data, error } = await exchangeCodeWithPkceBackups(
          (authCode) => getSupabaseOAuth().auth.exchangeCodeForSession(authCode),
          code,
          pkceVerifierStorageKey(supabaseUrl),
        )
        window.clearTimeout(watchdog)
        if (cancelled) return
        if (data?.session) {
          navigate('/', { replace: true })
          return
        }
        if (error) {
          failHome('bad_oauth_state', error.message)
          return
        }
      } else {
        window.clearTimeout(watchdog)
      }

      if (cancelled) return
      if (params.get('error') || params.get('error_code') || params.get('error_description')) {
        navigate(`/?${params.toString()}`, { replace: true })
        return
      }

      navigate('/', { replace: true })
    })()

    return () => {
      cancelled = true
      window.clearTimeout(watchdog)
    }
  }, [navigate])

  return (
    <div className="app-shell">
      <p className="muted">Finishing sign-in…</p>
    </div>
  )
}
