/*
 * Teacher-facing alert when a new item enters any approval queue.
 *
 * Why: teachers need the same heads-up students get on approval — banner + chime when
 * plan, checklist, final skill, or redemption rows appear. Wired from App.tsx via
 * TeacherSubmissionAlertSync → fetchTeacherPendingSnapshot → applyTeacherPendingSnapshot.
 *
 * Mirrors student approvalCelebration.ts (notifier + localStorage). See
 * docs/developer-handoff-recent-work.md
 */

import { playSubmissionAlertChime } from './alertSound'

export const TEACHER_SUBMISSION_ALERT_EVENT = 'nexus-teacher-submission-alert'

export type TeacherPendingKind = 'plan' | 'checklist' | 'skill' | 'redemption'

export type TeacherSubmissionAlert = {
  alertId: string
  kind: TeacherPendingKind
  studentName: string | null
  detail: string
}

export type TeacherSubmissionToast = {
  message: string
  alertIds: string[]
}

const PENDING_KEY = 'nexus:pending-teacher-submission-alert'
const shownThisSession = new Set<string>()

type Notifier = (t: TeacherSubmissionToast) => void

let liveNotifier: Notifier | null = null

export function setTeacherSubmissionAlertNotifier(fn: Notifier | null) {
  liveNotifier = fn
}

function dispatchAlertEvent() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TEACHER_SUBMISSION_ALERT_EVENT))
  }
}

export function kindLabel(kind: TeacherPendingKind): string {
  switch (kind) {
    case 'plan':
      return 'Plan'
    case 'checklist':
      return 'Checklist'
    case 'skill':
      return 'Final submission'
    case 'redemption':
      return 'Redemption'
  }
}

export function formatTeacherAlertMessage(items: TeacherSubmissionAlert[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) {
    const i = items[0]
    const who = i.studentName?.trim() || 'A student'
    const detail = i.detail.trim()
    return detail
      ? `${who} — ${detail} (${kindLabel(i.kind)})`
      : `${who} — ${kindLabel(i.kind)} ready to review`
  }
  return `${items.length} new submissions need your review`
}

export function shouldQueueTeacherAlert(alertId: string): boolean {
  return Boolean(alertId) && !shownThisSession.has(alertId)
}

export function markTeacherAlertsShown(alertIds: string[]) {
  for (const id of alertIds) {
    if (id) shownThisSession.add(id)
  }
}

export function queueTeacherSubmissionAlert(toast: TeacherSubmissionToast) {
  if (typeof window === 'undefined') return
  if (!toast.alertIds.length) return
  localStorage.setItem(PENDING_KEY, JSON.stringify(toast))
  liveNotifier?.(toast)
  dispatchAlertEvent()
  playSubmissionAlertChime()
}

export function peekTeacherSubmissionAlert(): TeacherSubmissionToast | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as TeacherSubmissionToast
    if (typeof p.message !== 'string' || !Array.isArray(p.alertIds)) return null
    return p
  } catch {
    return null
  }
}

export function clearTeacherSubmissionAlertAfterDismiss(alertIds: string[]) {
  if (typeof window === 'undefined') return
  localStorage.removeItem(PENDING_KEY)
  markTeacherAlertsShown(alertIds)
}
