/*
 * Student-facing alerts when a teacher approves plan, checklist, shop request, or redemption.
 * Final quest approval (WP + gold) still flows through approvalCelebration.ts.
 *
 * Dedupe is a short debounce only — the same patent can be returned and re-approved in one
 * session, and each approve must notify again.
 */

import { playApprovalChime } from './alertSound'
import { areStudentApprovalAlertsEnabled } from './notificationPreferences'

export const STUDENT_REVIEW_ALERT_EVENT = 'nexus-student-review-alert'

/** Ignore duplicate Realtime deliveries for the same logical approval within this window. */
const DEDUPE_MS = 3_000

export type StudentReviewAlert = {
  alertId: string
  message: string
}

const PENDING_KEY = 'nexus:pending-student-review-alert'
const recentAlertAt = new Map<string, number>()

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
  if (!alertId) return false
  const now = Date.now()
  const last = recentAlertAt.get(alertId) ?? 0
  if (now - last < DEDUPE_MS) return false
  return true
}

export function markStudentReviewAlertsShown(alertIds: string[]) {
  const now = Date.now()
  for (const id of alertIds) {
    if (id) recentAlertAt.set(id, now)
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

  markStudentReviewAlertsShown([alert.alertId])
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
