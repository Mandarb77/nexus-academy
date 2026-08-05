/*
 * Presentational banner for teacher approvals and denials
 * (plan, checklist, final packet, shop, redemption).
 */

import type { StudentReviewAlertTone } from '../lib/studentReviewAlert'
import { studentReviewAlertTitle } from '../lib/studentReviewAlert'

type Props = {
  message: string
  tone?: StudentReviewAlertTone
  onDismiss: () => void
}

export function StudentReviewBanner({ message, tone = 'approved', onDismiss }: Props) {
  const denied = tone === 'denied'
  return (
    <div
      className={`student-review-banner${denied ? ' student-review-banner--denied' : ''}`}
      role="status"
      aria-live="assertive"
    >
      <p className="student-review-banner__title">{studentReviewAlertTitle(tone)}</p>
      <p className="student-review-banner__message">{message}</p>
      <button type="button" className="student-review-banner__dismiss" onClick={onDismiss}>
        Got it ✕
      </button>
    </div>
  )
}
