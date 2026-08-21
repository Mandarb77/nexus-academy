/*
 * Banner for off-domain Google accounts browsing the class site read-only
 *
 * School (@kentshill.org) students and teachers never see this. Visitors can look
 * around; submits, shop, and kit stay locked until they use a school account.
 */

import { useAuth } from '../contexts/AuthContext'
import { isGuestBrowse } from '../lib/schoolEmail'

export function GuestBrowseBanner() {
  const { user, profile } = useAuth()
  if (!isGuestBrowse(user?.email ?? profile?.email, profile)) return null

  return (
    <div className="bench-preview-banner bench-preview-banner--guest" role="status">
      <span className="bench-preview-banner__text">
        Guest view — look around all you like. Use your <strong>@kentshill.org</strong> Google
        account to submit quests, buy supplies, and save progress.
      </span>
    </div>
  )
}
