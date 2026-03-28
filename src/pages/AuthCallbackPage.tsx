import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'

/** OAuth return URL — Supabase completes the session from the URL before this runs. */
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
