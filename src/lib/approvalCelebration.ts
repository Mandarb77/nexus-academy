/*
 * Cross-component “quest approved” celebration queue
 *
 * When a teacher approves a skill completion, Realtime fires in `ApprovalCelebrationSync`.
 * That path cannot always reach React state in the same component tree tick, and students
 * might miss the toast after a tab switch. This module bridges Realtime → `localStorage`
 * pending payload → `CustomEvent` → `ApprovalCelebrationHost`, and dedupes by completion
 * id so the same approval never spams duplicate banners after refresh or double triggers.
 *
 * `setApprovalCelebrationNotifier` exists specifically so the websocket handler can poke
 * the mounted host’s `setToast` without requiring a full page reload.
 *
 * Plays `playApprovalChime()` from alertSound.ts when queued. Teacher-side counterpart:
 * teacherSubmissionAlert.ts. See docs/developer-handoff-recent-work.md
 */

import { playApprovalChime } from './alertSound'

export const APPROVAL_CELEBRATION_EVENT = 'nexus-pending-approval-celebration'

const PENDING_KEY = 'nexus:pending-approval-celebration'
const LAST_SHOWN_KEY = 'nexus:approval-toast-completion-id'

export type PendingApprovalCelebration = {
  wp: number
  gold: number
  completionId: string
}

type Notifier = (c: PendingApprovalCelebration) => void

let liveNotifier: Notifier | null = null

export function setApprovalCelebrationNotifier(fn: Notifier | null) {
  liveNotifier = fn
}

/* Lets other listeners (e.g. skill tree page) react without importing the host. */
function dispatchCelebrationEvent() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(APPROVAL_CELEBRATION_EVENT))
  }
}

export function queueApprovalCelebration(c: PendingApprovalCelebration) {
  if (typeof window === 'undefined') return
  if (!c.completionId) return
  /* Persist so a mid-toast navigation or reload can still recover the celebration payload. */
  localStorage.setItem(PENDING_KEY, JSON.stringify(c))
  liveNotifier?.(c)
  dispatchCelebrationEvent()
  playApprovalChime()
}

export function peekPendingCelebration(): PendingApprovalCelebration | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as PendingApprovalCelebration
    /* Reject corrupted manual edits to storage — avoids throwing or showing NaN in the banner. */
    if (typeof p.wp !== 'number' || typeof p.gold !== 'number' || typeof p.completionId !== 'string') return null
    return p
  } catch {
    return null
  }
}

export function clearPendingCelebrationAfterDismiss(completionId: string) {
  if (typeof window === 'undefined') return
  localStorage.removeItem(PENDING_KEY)
  /* Remember which completion we already celebrated so a duplicate UPDATE does not re-queue. */
  localStorage.setItem(LAST_SHOWN_KEY, completionId)
}

export function getLastShownCompletionId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(LAST_SHOWN_KEY)
}

export function shouldQueueCompletionCelebration(completionId: string): boolean {
  if (!completionId) return false
  if (getLastShownCompletionId() === completionId) return false
  const pending = peekPendingCelebration()
  if (pending?.completionId === completionId) return false
  return true
}
