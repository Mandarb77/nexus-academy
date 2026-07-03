/*
 * Student-facing alerts when a teacher approves plan, checklist, shop request, or redemption.
 * Final quest approval (WP + gold) still flows through approvalCelebration.ts.
 */

import { playApprovalChime } from './alertSound'
import { areStudentApprovalAlertsEnabled } from './notificationPreferences'

export const STUDENT_REVIEW_ALERT_EVENT = 'nexus-student-review-alert'

export type StudentReviewAlert = {
  alertId: string
  message: string
}

const PENDING_KEY = 'nexus:pending-student-review-alert'
const shownThisSession = new Set<string>()

type Notifier = (alert: StudentReviewAlert) => void

let liveNotifier: Notifier | null = null

export function setStudentReviewAlertNotifier(fn: Notifier | null) {
  liveNotifier = fn
}

function dispatchAlertEvent() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STUDENT_REVIEW_ALERT_EVENT))
  }
}

export function shouldQueueStudentReviewAlert(alertId: string): boolean {
  return Boolean(alertId) && !shownThisSession.has(alertId)
}

export function markStudentReviewAlertsShown(alertIds: string[]) {
  for (const id of alertIds) {
    if (id) shownThisSession.add(id)
  }
}

export function queueStudentReviewAlert(alert: StudentReviewAlert) {
  if (typeof window === 'undefined') return
  if (!alert.alertId || !alert.message.trim()) return
  if (!shouldQueueStudentReviewAlert(alert.alertId)) return
  if (!areStudentApprovalAlertsEnabled()) {
    markStudentReviewAlertsShown([alert.alertId])
    return
  }

  localStorage.setItem(PENDING_KEY, JSON.stringify(alert))
  liveNotifier?.(alert)
  dispatchAlertEvent()
  playApprovalChime()
}

export function peekStudentReviewAlert(): StudentReviewAlert | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as StudentReviewAlert
    if (typeof p.alertId !== 'string' || typeof p.message !== 'string') return null
    return p
  } catch {
    return null
  }
}

export function clearStudentReviewAlertAfterDismiss(alertId: string) {
  if (typeof window === 'undefined') return
  localStorage.removeItem(PENDING_KEY)
  markStudentReviewAlertsShown([alertId])
}
