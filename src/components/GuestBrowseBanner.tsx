/*
 * Banner for visitors browsing the class site read-only
 *
 * School (@kentshill.org) students and teachers never see this. Visitors can look
 * around; submits, shop, and kit stay locked until they use a school account.
 */

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { isGuestBrowse } from '../lib/schoolEmail'

export function GuestBrowseBanner() {
  const { user, profile, signInWithGoogle, switchToSchoolGoogleAccount } = useAuth()
  const [busy, setBusy] = useState(false)
  if (!isGuestBrowse(user?.email ?? profile?.email, profile)) return null

  async function onSchool() {
    setBusy(true)
    try {
      if (user) {
        const started = await switchToSchoolGoogleAccount()
        if (!started) setBusy(false)
        return
      }
      await signInWithGoogle()
    } catch {
      setBusy(false)
    }
  }

  return (
    <div className="bench-preview-banner bench-preview-banner--guest" role="status">
      <span className="bench-preview-banner__text">
        Guest view — look around, but you cannot submit quests, buy supplies, or save progress.
        {user?.email ? (
          <>
            {' '}
            Signed in as <strong>{user.email}</strong>.
          </>
        ) : null}{' '}
        Use <strong>@kentshill.org</strong> to participate.
      </span>
      <button
        type="button"
        className="bench-preview-banner__exit"
        onClick={() => void onSchool()}
        disabled={busy}
      >
        {busy ? 'Opening Google…' : 'Use school account'}
      </button>
    </div>
  )
}
