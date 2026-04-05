import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const PENDING_TOKEN_KEY = 'nexus:pending-invite-token'

export function JoinPage() {
  const { token } = useParams<{ token: string }>()
  const { user, authReady, loading, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  const [status, setStatus] = useState<'idle' | 'claiming' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Persist the token so it survives the OAuth redirect.
  useEffect(() => {
    if (token) {
      sessionStorage.setItem(PENDING_TOKEN_KEY, token)
    }
  }, [token])

  // Once auth is ready and user is signed in, claim the invite.
  useEffect(() => {
    if (!authReady || loading || !user) return
    const pendingToken = sessionStorage.getItem(PENDING_TOKEN_KEY)
    if (!pendingToken || !isSupabaseConfigured) return

    sessionStorage.removeItem(PENDING_TOKEN_KEY)
    setStatus('claiming')

    void (async () => {
      try {
        const { data, error } = await supabase.rpc('claim_teacher_invite', { p_token: pendingToken })
        if (error) {
          setStatus('error')
          setErrorMsg(error.message)
          return
        }
        const result = data as { ok: boolean; error?: string }
        if (!result.ok) {
          const msg =
            result.error === 'already_used'
              ? 'This invite link has already been used.'
              : result.error === 'invalid_token'
                ? 'This invite link is not valid.'
                : 'Something went wrong — please ask your teacher for a new link.'
          setStatus('error')
          setErrorMsg(msg)
          return
        }
        setStatus('success')
        setTimeout(() => navigate('/dashboard', { replace: true }), 2000)
      } catch (e: unknown) {
        setStatus('error')
        setErrorMsg(e instanceof Error ? e.message : 'Unexpected error.')
      }
    })()
  }, [authReady, loading, user, navigate])

  const handleSignIn = async () => {
    setBusy(true)
    try {
      await signInWithGoogle()
    } catch {
      setBusy(false)
    }
  }

  return (
    <div className="app-shell auth-panel">
      <header className="brand">
        <h1>Nexus Academy</h1>
        <p className="tagline">Teacher invite</p>
      </header>

      <div className="card" style={{ maxWidth: '26rem', margin: '0 auto', textAlign: 'center' }}>
        {status === 'success' ? (
          <>
            <p style={{ fontSize: '2.5rem', margin: '0 0 0.5rem' }}>🎉</p>
            <h2 style={{ margin: '0 0 0.5rem' }}>Welcome, teacher!</h2>
            <p className="muted">Your account has been upgraded. Redirecting you to the dashboard…</p>
          </>
        ) : status === 'error' ? (
          <>
            <p style={{ fontSize: '2.5rem', margin: '0 0 0.5rem' }}>⚠️</p>
            <h2 style={{ margin: '0 0 0.5rem' }}>Invite error</h2>
            <p className="error">{errorMsg}</p>
            <p className="muted" style={{ marginTop: '0.75rem' }}>Ask the teacher who sent this link to generate a new one.</p>
          </>
        ) : status === 'claiming' ? (
          <>
            <p style={{ fontSize: '2.5rem', margin: '0 0 0.5rem' }}>⏳</p>
            <p className="muted">Activating your teacher account…</p>
          </>
        ) : !authReady || loading ? (
          <p className="muted">Loading…</p>
        ) : !user ? (
          <>
            <p style={{ fontSize: '2rem', margin: '0 0 0.75rem' }}>🏫</p>
            <h2 style={{ margin: '0 0 0.5rem' }}>You've been invited as a teacher</h2>
            <p className="muted" style={{ marginBottom: '1.25rem' }}>
              Sign in with Google to activate your teacher account. Use the Google account
              you want to use with Nexus Academy.
            </p>
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={() => void handleSignIn()}
              style={{ width: '100%' }}
            >
              {busy ? 'Redirecting…' : 'Sign in with Google'}
            </button>
          </>
        ) : (
          <p className="muted">You're signed in. Processing your invite…</p>
        )}
      </div>
    </div>
  )
}
