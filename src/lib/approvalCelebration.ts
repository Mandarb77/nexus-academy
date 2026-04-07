/** Shown on student home + skill tree after a quest is approved (rewards toast). */

export const APPROVAL_CELEBRATION_EVENT = 'nexus-pending-approval-celebration'

const PENDING_KEY = 'nexus:pending-approval-celebration'
const LAST_SHOWN_KEY = 'nexus:approval-toast-completion-id'

export type PendingApprovalCelebration = {
  wp: number
  gold: number
  completionId: string
}

function dispatchCelebrationEvent() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(APPROVAL_CELEBRATION_EVENT))
  }
}

/** Call when a skill completion becomes approved (Realtime or patent page). */
export function queueApprovalCelebration(c: PendingApprovalCelebration) {
  if (typeof window === 'undefined') return
  if (!c.completionId) return
  localStorage.setItem(PENDING_KEY, JSON.stringify(c))
  dispatchCelebrationEvent()
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
  localStorage.setItem(LAST_SHOWN_KEY, completionId)
}

export function getLastShownCompletionId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(LAST_SHOWN_KEY)
}
