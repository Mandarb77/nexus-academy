/*
 * Banner for off-domain Google accounts browsing the class site read-only
 *
 * School (@kentshill.org) students and teachers never see this. Visitors can look
 * around; submits, shop, and kit stay locked until they use a school account.
 */

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { isGuestBrowse } from '../lib/schoolEmail'

export function GuestBrowseBanner() {
  const { user, profile, switchToSchoolGoogleAccount } = useAuth()
  const [busy, setBusy] = useState(false)
  if (!isGuestBrowse(user?.email ?? profile?.email, profile)) return null

  async function onSwitch() {
    setBusy(true)
    try {
      const started = await switchToSchoolGoogleAccount()
      if (!started) setBusy(false)
    } catch {
      setBusy(false)
    }
  }

  return (
    <div className="bench-preview-banner bench-preview-banner--guest" role="status">
      <span className="bench-preview-banner__text">
        Guest view — you signed in as <strong>{user?.email}</strong>. Use your{' '}
        <strong>@kentshill.org</strong> Google account to submit quests, buy supplies, and save
        progress.
      </span>
      <button
        type="button"
        className="bench-preview-banner__exit"
        onClick={() => void onSwitch()}
        disabled={busy}
      >
        {busy ? 'Opening Google…' : 'Use school account'}
      </button>
    </div>
  )
}
