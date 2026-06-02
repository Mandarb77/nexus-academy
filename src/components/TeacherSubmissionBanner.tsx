/*
 * Teacher alert when a student submission enters any approval queue.
 */

import { Link } from 'react-router-dom'

type Props = {
  message: string
  onDismiss: () => void
}

export function TeacherSubmissionBanner({ message, onDismiss }: Props) {
  return (
    <div className="teacher-submission-banner" role="alert" aria-live="assertive">
      <p className="teacher-submission-banner__title">Needs your review</p>
      <p className="teacher-submission-banner__message">{message}</p>
      <div className="teacher-submission-banner__actions">
        <Link to="/teacher" className="teacher-submission-banner__open" onClick={onDismiss}>
          Open Teacher panel
        </Link>
        <button type="button" className="teacher-submission-banner__dismiss" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  )
}
