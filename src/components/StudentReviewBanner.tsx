/*
 * Presentational banner for teacher-decision notices (plan, checklist, packet,
 * shop, redemption, duty). Chickadee is static; copy comes from the queue.
 */

import { ChickadeeMark } from './ChickadeeMark'
import type { StudentReviewAlertTone } from '../lib/studentReviewAlert'

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
      <div className="student-review-banner__row">
        <ChickadeeMark />
        <p className="student-review-banner__message">{message}</p>
      </div>
      <button type="button" className="student-review-banner__dismiss" onClick={onDismiss}>
        Got it
      </button>
    </div>
  )
}
