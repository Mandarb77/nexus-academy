/*
 * Google sign-in screen (`/login`) and “already signed in” explainer
 *
 * Shown when logged-out users hit `/login` directly; `HomeRoute` normally sends everyone
 * through `/` instead. Keeps the OAuth button enabled while `authReady` is false so the
 * control never deadlocks on slow `getSession`. When a session already exists, explains
 * why the Google CTA disappeared (students often think the site broke). Wires
 * `signInWithGoogle` / `signOut` from `AuthContext` and gates on `isSupabaseConfigured`.
 */

import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'
import { oauthRedirectErrorMessage } from '../lib/oauthRedirectError'
import { clearGoogleOAuthStart } from '../lib/pkceVerifierBackup'
import { isGuestBrowse } from '../lib/schoolEmail'

export function LoginPage() {
  const { user, profile, authReady, signInWithGoogle, signOut, switchToSchoolGoogleAccount } =
    useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(() =>
    oauthRedirectErrorMessage(window.location.search),
  )
  const [busy, setBusy] = useState(false)
  const [previewSetupIncomplete, setPreviewSetupIncomplete] = useState(false)
  const startingRef = useRef(false)

  useEffect(() => {
    clearGoogleOAuthStart()
  }, [])

  useEffect(() => {
    const fromUrl = oauthRedirectErrorMessage(searchParams.toString())
    if (!fromUrl) return
    setError(fromUrl)
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  const showSetupNotice = !isSupabaseConfigured || previewSetupIncomplete
  /** Allow click while session is still restoring — signInWithOAuth is safe; avoids a stuck disabled button. */
  const canUseGoogle =
    isSupabaseConfigured && !previewSetupIncomplete && !busy

  async function handleSwitchToSchool() {
    if (startingRef.current || busy) return
    startingRef.current = true
    setError(null)
    setBusy(true)
    try {
      const started = await switchToSchoolGoogleAccount()
      if (!started) {
        startingRef.current = false
        setBusy(false)
        setError('Google sign-in is already open. Pick your @kentshill.org account in that window.')
      }
    } catch {
      startingRef.current = false
      setBusy(false)
      setError('Could not restart Google sign-in. Sign out and try again.')
    }
  }

  /**
   * If we auto-redirect when a session exists, users land on home and never see why
   * the Google button is "missing" (it only shows when signed out). Show this screen instead.
   */
  if (authReady && user) {
    const guest = isGuestBrowse(user.email ?? profile?.email, profile)
    return (
      <div className="app-shell bench-chrome auth-panel">
        <header className="brand">
          <h1>Nexus Academy at Kents Hill</h1>
          <p className="tagline">
            {guest ? 'That is not a school Google account' : "You're already signed in"}
          </p>
        </header>
        <div className="card">
          <p className="signed-in-email">
            Signed in as <strong>{user.email}</strong>
          </p>
          {guest ? (
            <p className="muted signed-in-hint">
              Class work needs <strong>@kentshill.org</strong>. Personal Gmail can look around, but
              it will not save progress. Switch accounts to continue as a student.
            </p>
          ) : (
            <p className="muted signed-in-hint">
              The <strong>Sign in with Google</strong> button only appears on this page when you're
              signed out. Use <strong>Sign out</strong> below if you want to see it again or use
              another account.
            </p>
          )}
          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="signed-in-actions">
            {guest ? (
              <button
                type="button"
                className="btn-primary btn-block"
                onClick={() => void handleSwitchToSchool()}
                disabled={busy}
              >
                {busy ? 'Opening Google…' : 'Switch to school account'}
              </button>
            ) : (
              <Link to="/" className="btn-primary btn-block">
                Go to home
              </Link>
            )}
            <button type="button" className="btn-secondary btn-block" onClick={() => signOut()}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    )
  }

  async function handleGoogle() {
    if (startingRef.current || busy) return
    startingRef.current = true
    setError(null)
    setBusy(true)
    try {
      const started = await signInWithGoogle()
      if (!started) {
        startingRef.current = false
        setBusy(false)
        setError('Sign-in already started. Finish picking your account — do not click Google again.')
      }
    } catch {
      startingRef.current = false
      setBusy(false)
      setError('Could not start Google sign-in. Check Supabase and redirect URLs.')
    }
  }

  return (
    <div className="app-shell bench-chrome auth-panel">
      <header className="brand">
        <h1>Nexus Academy at Kents Hill</h1>
        <p className="tagline">
          Technology and Engineering Class — use your <strong>@kentshill.org</strong> Google
          account, not a personal Gmail.
        </p>
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
        <p className="muted login-school-hint">
          On the next screen, pick your school account (<strong>@kentshill.org</strong>).
        </p>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
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
