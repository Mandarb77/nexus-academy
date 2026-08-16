/*
 * Student-facing chickadee notices when a teacher approves or returns plan, checklist,
 * shop request, redemption, or duty. Final packet approve still flows through
 * approvalCelebration.ts (same patent-approved string + WP/gold).
 *
 * Dedupe is a short debounce only — the same patent can be returned and re-approved in one
 * session, and each decide must notify again.
 */

import { playApprovalChime } from './alertSound'
import { areStudentApprovalAlertsEnabled } from './notificationPreferences'
import { safeInternalHref } from './questContinue'

export const STUDENT_REVIEW_ALERT_EVENT = 'nexus-student-review-alert'

/** Ignore duplicate Realtime deliveries for the same logical decision within this window. */
const DEDUPE_MS = 3_000

export type StudentReviewAlertTone = 'approved' | 'denied'

export type StudentReviewAlert = {
  alertId: string
  message: string
  /** Defaults to approved when omitted (older pending toasts). */
  tone?: StudentReviewAlertTone
  /** In-app path to the quest/shop page the student should reopen (deny send-back). */
  continueHref?: string
  continueLabel?: string
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

  const continueHref = safeInternalHref(alert.continueHref)
  const continueLabel = alert.continueLabel?.trim() || undefined
  const normalized: StudentReviewAlert = {
    alertId: alert.alertId,
    message: alert.message,
    tone: alert.tone === 'denied' ? 'denied' : 'approved',
    ...(continueHref
      ? { continueHref, continueLabel: continueLabel || 'Continue' }
      : {}),
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
    const continueHref = safeInternalHref(p.continueHref)
    const continueLabel = typeof p.continueLabel === 'string' ? p.continueLabel.trim() : ''
    return {
      alertId: p.alertId,
      message: p.message,
      tone: p.tone === 'denied' ? 'denied' : 'approved',
      ...(continueHref
        ? { continueHref, continueLabel: continueLabel || 'Continue' }
        : {}),
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

/** Fixed chickadee copy. `[Name]` is replaced with the shop voice name — never invent other wording. */
export const CHICKADEE_PATENT_APPROVED = '[Name] — patent approved.'
export const CHICKADEE_PATENT_NOT_APPROVED = '[Name] — patent not approved. See Mr. Cook.'
export const CHICKADEE_USAGE_NOT_NOW = '[Name] — not now. See Mr. Cook.'

export function fillChickadeeNotice(template: string, name: string): string {
  return template.replaceAll('[Name]', name)
}
