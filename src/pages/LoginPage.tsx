import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'

export function LoginPage() {
  const { user, authReady, signInWithGoogle, signOut } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [previewSetupIncomplete, setPreviewSetupIncomplete] = useState(false)

  const showSetupNotice = !isSupabaseConfigured || previewSetupIncomplete
  /** Allow click while session is still restoring — signInWithOAuth is safe; avoids a stuck disabled button. */
  const canUseGoogle =
    isSupabaseConfigured && !previewSetupIncomplete && !busy

  /**
   * If we auto-redirect when a session exists, users land on home and never see why
   * the Google button is "missing" (it only shows when signed out). Show this screen instead.
   */
  if (authReady && user) {
    return (
      <div className="app-shell auth-panel">
        <header className="brand">
          <h1>Nexus Academy</h1>
          <p className="tagline">You're already signed in</p>
        </header>
        <div className="card">
          <p className="signed-in-email">
            Signed in as <strong>{user.email}</strong>
          </p>
          <p className="muted signed-in-hint">
            The <strong>Sign in with Google</strong> button only appears on this page when you're
            signed out. Use <strong>Sign out</strong> below if you want to see it again or use
            another account.
          </p>
          <div className="signed-in-actions">
            <Link to="/" className="btn-primary btn-block">
              Go to home
            </Link>
            <button type="button" className="btn-secondary btn-block" onClick={() => signOut()}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    )
  }

  async function handleGoogle() {
    setError(null)
    setBusy(true)
    try {
      await signInWithGoogle()
    } catch {
      setError('Could not start Google sign-in. Check Supabase and redirect URLs.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-shell auth-panel">
      <header className="brand">
        <h1>Nexus Academy</h1>
        <p className="tagline">Maker class — use your school Google account</p>
      </header>

      <div className="card login-actions">
        {!authReady ? (
          <p className="muted session-hint" aria-live="polite">
            Checking session…
          </p>
        ) : null}
        <button
          type="button"
          className="btn-google"
          onClick={handleGoogle}
          disabled={!canUseGoogle}
          aria-label="Sign in with Google"
        >
          {busy ? 'Redirecting…' : 'Sign in with Google'}
        </button>
        {error ? <p className="error">{error}</p> : null}
      </div>

      {showSetupNotice ? (
        <div className="card setup-notice" role="alert">
          <strong className="setup-notice-title">Setup incomplete</strong>
          {previewSetupIncomplete && isSupabaseConfigured ? (
            <p className="setup-notice-preview">Preview only — your <code>.env</code> is fine.</p>
          ) : null}
          <p className="setup-notice-body">
            Supabase is not connected. Copy <code>.env.example</code> to{' '}
            <code>.env</code> in the project root, then add{' '}
            <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>{' '}
            from your Supabase project (<strong>Project Settings → API</strong>).
            Restart the dev server after saving <code>.env</code>.
          </p>
        </div>
      ) : null}

      {import.meta.env.DEV ? (
        <div className="dev-tools">
          <button
            type="button"
            className="btn-dev-preview"
            onClick={() => setPreviewSetupIncomplete((v) => !v)}
          >
            {previewSetupIncomplete
              ? 'Hide setup-incomplete preview'
              : 'Test: show setup-incomplete UI'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
