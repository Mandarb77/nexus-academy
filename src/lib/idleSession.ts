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

export function installIdleListeners(onWakeFromQuiet?: () => void): () => void {
  if (listenersOn) return () => {}
  listenersOn = true

  let moveArmed = true
  const bump = () => {
    const wasQuiet = isStudentNetworkQuiet()
    touchIdleClock()
    if (wasQuiet) onWakeFromQuiet?.()
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

  return () => {
    listenersOn = false
    window.removeEventListener('pointerdown', bump, { capture: true })
    window.removeEventListener('keydown', bump, { capture: true })
    window.removeEventListener('touchstart', bump, { capture: true })
    window.removeEventListener('mousemove', onMove, { capture: true })
  }
}
