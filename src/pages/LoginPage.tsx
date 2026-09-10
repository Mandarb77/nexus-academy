/*
 * Google sign-in screen (`/login`) and “already signed in” explainer
 *
 * Shown when logged-out users hit `/login` directly; `HomeRoute` normally sends everyone
 * through `/` instead. The Google button stays clickable even while a previous attempt
 * is still opening (do not disable it for “busy”). When a session already exists, explains
 * why the Google CTA disappeared (students often think the site broke). Wires
 * `signInWithGoogle` / `signOut` from `AuthContext` and gates on `isSupabaseConfigured`.
 */

import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'
import { oauthRedirectErrorMessage } from '../lib/oauthRedirectError'
import { isGuestBrowse } from '../lib/schoolEmail'

export function LoginPage() {
  const { user, profile, signInWithGoogle, signOut, switchToSchoolGoogleAccount } =
    useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(() =>
    oauthRedirectErrorMessage(window.location.search),
  )
  const [busy, setBusy] = useState(false)
  const [previewSetupIncomplete, setPreviewSetupIncomplete] = useState(false)

  useEffect(() => {
    const fromUrl = oauthRedirectErrorMessage(searchParams.toString())
    if (!fromUrl) return
    setError(fromUrl)
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  const showSetupNotice = !isSupabaseConfigured || previewSetupIncomplete
  const canUseGoogle = isSupabaseConfigured && !previewSetupIncomplete

  async function handleSwitchToSchool() {
    setError(null)
    setBusy(true)
    try {
      const started = await switchToSchoolGoogleAccount()
      if (!started) {
        setBusy(false)
        setError('Google sign-in is already open. Pick your @kentshill.org account in that window.')
      }
    } catch {
      setBusy(false)
      setError('Could not restart Google sign-in. Sign out and try again.')
    }
  }

  /**
   * If we auto-redirect when a session exists, users land on home and never see why
   * the Google button is "missing" (it only shows when signed out). Show this screen instead.
   */
  if (user) {
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
    setError(null)
    setBusy(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setBusy(false)
      const message = err instanceof Error ? err.message : ''
      setError(
        message.includes('timed out')
          ? 'Google took too long to open. Click Sign in with Google once more.'
          : 'Could not start Google. Click Sign in with Google once more.',
      )
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
        <button
          type="button"
          className="btn-google"
          onClick={() => void handleGoogle()}
          disabled={!canUseGoogle}
          aria-label="Sign in with Google"
        >
          {busy ? 'Opening Google…' : 'Sign in with Google'}
        </button>
        <p className="muted login-school-hint">
          Google will open next — that is the login, not an error. Pick your{' '}
          <strong>@kentshill.org</strong> account, then you come back here. Do not paste or
          reopen the supabase.co link.
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
