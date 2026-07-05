/*
 * Cross-component “quest approved” celebration queue
 *
 * When a teacher approves a skill completion, Realtime fires in `ApprovalCelebrationSync`.
 * That path cannot always reach React state in the same component tree tick, and students
 * might miss the toast after a tab switch. This module bridges Realtime → `localStorage`
 * pending payload → `CustomEvent` → `ApprovalCelebrationHost`.
 *
 * Dedupe is a short debounce only so a returned-then-reapproved completion notifies again.
 */

import { playApprovalChime } from './alertSound'
import { areStudentApprovalAlertsEnabled } from './notificationPreferences'

export const APPROVAL_CELEBRATION_EVENT = 'nexus-pending-approval-celebration'

const PENDING_KEY = 'nexus:pending-approval-celebration'
const DEDUPE_MS = 3_000
const recentCelebrationAt = new Map<string, number>()

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

function dispatchCelebrationEvent() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(APPROVAL_CELEBRATION_EVENT))
  }
}

export function queueApprovalCelebration(c: PendingApprovalCelebration) {
  if (typeof window === 'undefined') return
  if (!c.completionId) return
  if (!areStudentApprovalAlertsEnabled()) return

  const pending = peekPendingCelebration()
  /* Same approval still on screen — refresh WP/gold when the award trigger finishes. */
  if (pending?.completionId === c.completionId) {
    localStorage.setItem(PENDING_KEY, JSON.stringify(c))
    liveNotifier?.(c)
    dispatchCelebrationEvent()
    return
  }

  const last = recentCelebrationAt.get(c.completionId) ?? 0
  if (Date.now() - last < DEDUPE_MS) return

  recentCelebrationAt.set(c.completionId, Date.now())
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
    if (typeof p.wp !== 'number' || typeof p.gold !== 'number' || typeof p.completionId !== 'string') return null
    return p
  } catch {
    return null
  }
}

export function clearPendingCelebrationAfterDismiss(completionId: string) {
  if (typeof window === 'undefined') return
  localStorage.removeItem(PENDING_KEY)
  if (completionId) recentCelebrationAt.set(completionId, Date.now())
}

export function shouldQueueCompletionCelebration(completionId: string): boolean {
  if (!completionId) return false
  const pending = peekPendingCelebration()
  if (pending?.completionId === completionId) return true
  const last = recentCelebrationAt.get(completionId) ?? 0
  if (Date.now() - last < DEDUPE_MS) return false
  return true
}
