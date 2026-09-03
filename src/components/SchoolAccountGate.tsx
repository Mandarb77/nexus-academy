/*
 * Blocking prompt when a student signs in with a personal Google account
 *
 * Class work needs @kentshill.org. A quiet banner is easy to miss, and the Google
 * button is gone once any session exists — so they appear stuck. This overlay
 * names the account they used and starts a fresh Google picker for school login.
 * Parents/visitors can continue as a read-only guest for this tab.
 */

import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isGuestBrowse, SCHOOL_EMAIL_DOMAIN } from '../lib/schoolEmail'

const GUEST_OK_KEY = 'nexus:guest-browse-ok'

function guestOkThisTab(): boolean {
  try {
    return sessionStorage.getItem(GUEST_OK_KEY) === '1'
  } catch {
    return false
  }
}

export function SchoolAccountGate() {
  const { user, profile, switchToSchoolGoogleAccount } = useAuth()
  const { pathname } = useLocation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guestOk, setGuestOk] = useState(guestOkThisTab)

  const show = Boolean(
    user &&
      !pathname.startsWith('/cleanup') &&
      !pathname.startsWith('/join') &&
      isGuestBrowse(user.email ?? profile?.email, profile) &&
      !guestOk,
  )

  if (!show) return null

  async function onSwitch() {
    setBusy(true)
    setError(null)
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

  function onContinueAsGuest() {
    try {
      sessionStorage.setItem(GUEST_OK_KEY, '1')
    } catch {
      /* ignore */
    }
    setGuestOk(true)
  }

  return (
    <div className="preferred-name-gate" role="dialog" aria-modal="true" aria-labelledby="school-account-title">
      <div className="preferred-name-card">
        <p className="preferred-name-card__eyebrow">School account needed</p>
        <h2 id="school-account-title" className="preferred-name-card__title">
          Use your Kents Hill Google account
        </h2>
        <p className="preferred-name-card__body">
          You signed in as <strong className="school-account-gate__email">{user?.email}</strong>.
          Class work needs <strong>@{SCHOOL_EMAIL_DOMAIN}</strong> — not a personal Gmail.
        </p>
        {error ? (
          <p className="preferred-name-card__error" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          className="btn-primary preferred-name-card__submit"
          onClick={() => void onSwitch()}
          disabled={busy}
        >
          {busy ? 'Opening Google…' : 'Switch to school account'}
        </button>
        <button
          type="button"
          className="btn-secondary school-account-gate__guest"
          onClick={onContinueAsGuest}
          disabled={busy}
        >
          Look around as a guest
        </button>
      </div>
    </div>
  )
}
