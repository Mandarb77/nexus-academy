/*
 * Student-facing alerts when a teacher approves or denies plan, checklist,
 * final packet, shop request, or redemption.
 * Final quest approval (WP + gold) still flows through approvalCelebration.ts.
 *
 * Dedupe is a short debounce only — the same patent can be returned and re-approved in one
 * session, and each decide must notify again.
 */

import { playApprovalChime } from './alertSound'
import { areStudentApprovalAlertsEnabled } from './notificationPreferences'

export const STUDENT_REVIEW_ALERT_EVENT = 'nexus-student-review-alert'

/** Ignore duplicate Realtime deliveries for the same logical decision within this window. */
const DEDUPE_MS = 3_000

export type StudentReviewAlertTone = 'approved' | 'denied'

export type StudentReviewAlert = {
  alertId: string
  message: string
  /** Defaults to approved when omitted (older pending toasts). */
  tone?: StudentReviewAlertTone
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

  const normalized: StudentReviewAlert = {
    alertId: alert.alertId,
    message: alert.message,
    tone: alert.tone === 'denied' ? 'denied' : 'approved',
  }

  markStudentReviewAlertsShown([normalized.alertId])
  localStorage.setItem(PENDING_KEY, JSON.stringify(normalized))
  liveNotifier?.(normalized)
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
    return {
      alertId: p.alertId,
      message: p.message,
      tone: p.tone === 'denied' ? 'denied' : 'approved',
    }
  } catch {
    return null
  }
}

export function clearStudentReviewAlertAfterDismiss(alertId: string) {
  if (typeof window === 'undefined') return
  localStorage.removeItem(PENDING_KEY)
  markStudentReviewAlertsShown([alertId])
}

export function studentReviewAlertTitle(tone: StudentReviewAlertTone = 'approved'): string {
  return tone === 'denied' ? 'Denied' : 'Approved!'
}
