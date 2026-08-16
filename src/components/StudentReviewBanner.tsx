/*
 * Presentational banner for teacher-decision notices (plan, checklist, packet,
 * shop, redemption, duty). Chickadee is static; copy comes from the queue.
 */

import { Link } from 'react-router-dom'
import { ChickadeeMark } from './ChickadeeMark'
import type { StudentReviewAlertTone } from '../lib/studentReviewAlert'

type Props = {
  message: string
  tone?: StudentReviewAlertTone
  continueHref?: string
  continueLabel?: string
  onDismiss: () => void
}

export function StudentReviewBanner({
  message,
  tone = 'approved',
  continueHref,
  continueLabel = 'Continue',
  onDismiss,
}: Props) {
  const denied = tone === 'denied'
  return (
    <div
      className={`student-review-banner${denied ? ' student-review-banner--denied' : ''}`}
      role="status"
      aria-live="assertive"
    >
      <div className="student-review-banner__row">
        <ChickadeeMark />
        <p className="student-review-banner__message">{message}</p>
      </div>
      <div className="student-review-banner__actions">
        {continueHref ? (
          <Link to={continueHref} className="student-review-banner__continue">
            {continueLabel}
          </Link>
        ) : null}
        <button type="button" className="student-review-banner__dismiss" onClick={onDismiss}>
          Got it
        </button>
      </div>
    </div>
  )
}
