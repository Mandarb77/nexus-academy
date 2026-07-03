/*
 * Presentational banner for non-final teacher approvals (plan, checklist, shop, redemption).
 */

type Props = {
  message: string
  onDismiss: () => void
}

export function StudentReviewBanner({ message, onDismiss }: Props) {
  return (
    <div className="student-review-banner" role="status" aria-live="assertive">
      <p className="student-review-banner__title">Approved!</p>
      <p className="student-review-banner__message">{message}</p>
      <button type="button" className="student-review-banner__dismiss" onClick={onDismiss}>
        Got it ✕
      </button>
    </div>
  )
}
