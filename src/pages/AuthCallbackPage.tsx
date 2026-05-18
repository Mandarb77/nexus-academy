/*
 * OAuth redirect handler (`/auth/callback`)
 *
 * Supabase PKCE flow lands here with tokens in the URL fragment; `supabase` client is
 * configured with `detectSessionInUrl: true`, so by the time React runs, the session is
 * usually established. This page just waits for `authReady` then navigates home — keeps
 * the URL clean and avoids flashing protected routes before `getSession` resolves.
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const { user, authReady } = useAuth()

  useEffect(() => {
    if (!isSupabaseConfigured) {
      navigate('/', { replace: true })
      return
    }
    if (!authReady) return
    if (user) {
      navigate('/', { replace: true })
    } else {
      navigate('/', { replace: true })
    }
  }, [user, authReady, navigate])

  return (
    <div className="app-shell">
      <p className="muted">Finishing sign-in…</p>
    </div>
  )
}
