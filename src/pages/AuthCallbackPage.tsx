/*
 * OAuth redirect handler (`/auth/callback`)
 *
 * PKCE lands here with `?code=`. The Supabase client (`detectSessionInUrl`) exchanges
 * that code during initialize; `getSession` waits for that, which is `authReady`.
 * If GoTrue bounced here with `?error=`, keep those params so LoginPage can explain.
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

    const params = new URLSearchParams(window.location.search)
    if (!user && (params.get('error') || params.get('error_code') || params.get('error_description'))) {
      navigate(`/?${params.toString()}`, { replace: true })
      return
    }

    navigate('/', { replace: true })
  }, [user, authReady, navigate])

  return (
    <div className="app-shell">
      <p className="muted">Finishing sign-in…</p>
    </div>
  )
}
