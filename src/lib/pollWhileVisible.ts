/*
 * Interval that skips work when the tab is hidden (any laptop left on a page
 * overnight). Optional jitter spreads class-hour polls so they do not hit the
 * database in one wave.
 *
 * Students poll notices only while the tab is visible and they are not idle.
 */

import { isStudentNetworkQuiet } from './idleSession'

/** Approvals Pi / laptop: kids just submitted. */
export const TEACHER_PENDING_POLL_MS = 8_000
/** Teacher pages that are not the approvals inbox. */
export const TEACHER_OTHER_POLL_MS = 60_000
export const TEACHER_STORYLINE_POLL_MS = 120_000
export const CLEANUP_KIOSK_POLL_MS = 10_000
/** Student WP / tree / toasts: only when the tab wakes, and rarely. */
export const STUDENT_WAKE_REFRESH_MIN_MS = 180_000
/** Chickadee + tree/patent gates while a student is actually at the keyboard. */
export const STUDENT_NOTICE_POLL_MS = 12_000

export function pollWhileVisible(
  fn: () => void,
  ms: number,
  options?: { immediate?: boolean; jitterMs?: number; skipWhenQuiet?: boolean },
): () => void {
  let intervalId = 0
  const tick = () => {
    if (document.hidden) return
    if (options?.skipWhenQuiet && isStudentNetworkQuiet()) return
    fn()
  }
  if (options?.immediate) tick()
  const jitter = Math.max(0, options?.jitterMs ?? 0)
  const startId = window.setTimeout(() => {
    intervalId = window.setInterval(tick, ms)
  }, jitter)
  const onVis = () => {
    if (!document.hidden) tick()
  }
  document.addEventListener('visibilitychange', onVis)
  return () => {
    window.clearTimeout(startId)
    window.clearInterval(intervalId)
    document.removeEventListener('visibilitychange', onVis)
  }
}

export function jitterFromId(id: string, maxMs: number): number {
  let n = 0
  for (let i = 0; i < id.length; i++) n = (n + id.charCodeAt(i) * (i + 1)) % (maxMs + 1)
  return n
}

/** No interval. Ignores the class-start focus storm, then refreshes at most once per minMs. */
export function refreshWhenTabAwake(fn: () => void, minMs: number): () => void {
  let last = Date.now()
  const run = () => {
    if (document.hidden) return
    if (isStudentNetworkQuiet()) return
    const now = Date.now()
    if (now - last < minMs) return
    last = now
    fn()
  }
  document.addEventListener('visibilitychange', run)
  window.addEventListener('focus', run)
  return () => {
    document.removeEventListener('visibilitychange', run)
    window.removeEventListener('focus', run)
  }
}
