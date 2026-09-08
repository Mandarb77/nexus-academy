/*
 * Coalesce teacher pending-queue reads.
 *
 * Every student checkbox writes `patents`, which used to trigger a full teacher
 * snapshot (six REST queries) on every Realtime UPDATE. During class that
 * stampedes PostgREST until Auth PKCE also 504s and nobody can log in.
 * At most one flush per window; all registered refreshers run together.
 */

const WINDOW_MS = 15_000

const listeners = new Set<() => Promise<void>>()
let lastRun = 0
let timer: ReturnType<typeof setTimeout> | null = null
let inFlight = false
let queued = false

async function flush() {
  if (inFlight) {
    queued = true
    return
  }
  const fns = [...listeners]
  if (fns.length === 0) return
  inFlight = true
  queued = false
  lastRun = Date.now()
  try {
    await Promise.all(fns.map((fn) => fn()))
  } finally {
    inFlight = false
    if (queued) {
      queued = false
      armTimer()
    }
  }
}

function armTimer() {
  if (timer) return
  const wait = Math.max(WINDOW_MS, WINDOW_MS - (Date.now() - lastRun))
  timer = setTimeout(() => {
    timer = null
    void flush()
  }, wait)
}

export function scheduleTeacherPendingRefresh(fn: () => Promise<void>): void {
  listeners.add(fn)
  const wait = Math.max(0, WINDOW_MS - (Date.now() - lastRun))
  if (wait === 0 && !inFlight) {
    void flush()
    return
  }
  armTimer()
}
