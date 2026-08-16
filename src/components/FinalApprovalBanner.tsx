/*
 * Presentational patent-approved banner (chickadee copy + WP / gold amounts)
 *
 * Used by `ApprovalCelebrationHost`. Copy is the fixed patent-approved string;
 * WP/gold are the award amounts, not extra praise.
 */

import { ChickadeeMark } from './ChickadeeMark'
import { CHICKADEE_PATENT_APPROVED, fillChickadeeNotice } from '../lib/studentReviewAlert'

type Props = {
  studentName: string
  wp: number
  gold: number
  onDismiss: () => void
  /** `pageTop` = in document flow under the nav (home / skill tree). Default = fixed overlay. */
  placement?: 'fixed' | 'pageTop'
}

export function FinalApprovalBanner({
  studentName,
  wp,
  gold,
  onDismiss,
  placement = 'fixed',
}: Props) {
  return (
    <div
      className={`final-approval-banner${placement === 'pageTop' ? ' final-approval-banner--page-top' : ''}`}
      role="status"
      aria-live="assertive"
    >
      <div className="final-approval-banner__row">
        <ChickadeeMark />
        <p className="final-approval-banner__title">
          {fillChickadeeNotice(CHICKADEE_PATENT_APPROVED, studentName)}
        </p>
      </div>
      <div className="final-approval-banner__rewards">
        <div className="final-approval-banner__reward final-approval-banner__wp">
          <span className="final-approval-banner__reward-amount">+{wp}</span>
          <span className="final-approval-banner__reward-label">Workshop Points</span>
        </div>
        <div className="final-approval-banner__reward final-approval-banner__gold">
          <span className="final-approval-banner__reward-amount">+{gold}</span>
          <span className="final-approval-banner__reward-label">Gold</span>
        </div>
      </div>
      <button type="button" className="final-approval-banner__dismiss" onClick={onDismiss}>
        Got it
      </button>
    </div>
  )
}
