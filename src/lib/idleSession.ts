/*
 * Student idle clock — Macs, ThinkPads, Chromebooks, anything left on a desk.
 *
 * Teachers and cleanup kiosks are not included: the Pi has no mouse, and a teacher
 * walking the shop should not get kicked off Approvals.
 *
 * Quiet (2 min): stop JWT refresh and skip student background fetches.
 * Logout (75 min): one class period with no pointer/keyboard → local sign-out.
 */

export const STUDENT_IDLE_QUIET_MS = 2 * 60 * 1000
export const STUDENT_IDLE_LOGOUT_MS = 75 * 60 * 1000

const IDLE_NOTICE_KEY = 'nexus-idle-logout'

let lastActivityAt = Date.now()
let listenersOn = false

export function idleMs(): number {
  return Date.now() - lastActivityAt
}

export function isStudentNetworkQuiet(): boolean {
  return idleMs() >= STUDENT_IDLE_QUIET_MS
}

export function touchIdleClock(): void {
  lastActivityAt = Date.now()
}

export function writeIdleLogoutNotice(): void {
  try {
    sessionStorage.setItem(IDLE_NOTICE_KEY, '1')
  } catch {
    /* private mode */
  }
}

export function takeIdleLogoutNotice(): boolean {
  try {
    const hit = sessionStorage.getItem(IDLE_NOTICE_KEY) === '1'
    if (hit) sessionStorage.removeItem(IDLE_NOTICE_KEY)
    return hit
  } catch {
    return false
  }
}

const wakes = new Set<() => void>()

export function onIdleWake(fn: () => void): () => void {
  wakes.add(fn)
  return () => {
    wakes.delete(fn)
  }
}

/** Page-lifetime listeners. Safe to call more than once. */
export function installIdleListeners(): void {
  if (listenersOn) return
  listenersOn = true

  let moveArmed = true
  const bump = () => {
    const wasQuiet = isStudentNetworkQuiet()
    touchIdleClock()
    if (wasQuiet) {
      for (const fn of wakes) fn()
    }
  }
  const onMove = () => {
    if (!moveArmed) return
    moveArmed = false
    window.setTimeout(() => {
      moveArmed = true
    }, 5_000)
    bump()
  }

  window.addEventListener('pointerdown', bump, { capture: true })
  window.addEventListener('keydown', bump, { capture: true })
  window.addEventListener('touchstart', bump, { capture: true })
  window.addEventListener('mousemove', onMove, { capture: true })
}
