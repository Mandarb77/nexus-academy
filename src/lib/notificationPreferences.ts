/*
 * Per-browser notification preferences (localStorage).
 *
 * Teachers can mute submission banners + chimes without losing Realtime list refreshes.
 * Students always receive approval alerts unless we add a student toggle later.
 */

export const TEACHER_SUBMISSION_ALERTS_KEY = 'nexus:teacher-submission-alerts-enabled'
export const NOTIFICATION_PREF_EVENT = 'nexus-notification-pref-change'

function dispatchPrefChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(NOTIFICATION_PREF_EVENT))
  }
}

/** Default on — teachers hear a chime + see a banner for new student submissions. */
export function areTeacherSubmissionAlertsEnabled(): boolean {
  if (typeof window === 'undefined') return true
  return window.localStorage.getItem(TEACHER_SUBMISSION_ALERTS_KEY) !== '0'
}

export function setTeacherSubmissionAlertsEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TEACHER_SUBMISSION_ALERTS_KEY, enabled ? '1' : '0')
  dispatchPrefChange()
}

/** Default on — students hear a chime + see a banner when a teacher approves work. */
export function areStudentApprovalAlertsEnabled(): boolean {
  return true
}
