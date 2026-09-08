/*
 * Coalesce teacher pending-queue reads behind one registered refresher set.
 *
 * Register in useEffect and unregister on cleanup so leaving `/teacher` cannot
 * keep setState + REST alive. Schedule does not add listeners.
 */

const WINDOW_MS = 4_000

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
  const wait = Math.max(0, WINDOW_MS - (Date.now() - lastRun))
  timer = setTimeout(() => {
    timer = null
    void flush()
  }, wait)
}

export function registerTeacherPendingRefresh(fn: () => Promise<void>): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function scheduleTeacherPendingRefresh(): void {
  if (listeners.size === 0) return
  const wait = Math.max(0, WINDOW_MS - (Date.now() - lastRun))
  if (wait === 0 && !inFlight) {
    void flush()
    return
  }
  armTimer()
}

/** True when a queue row entered or left `pending` — ignore award-column UPDATEs. */
export function isPendingQueueTransition(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
): boolean {
  const before = prev.status
  const after = next.status
  if (before === after) return false
  return before === 'pending' || after === 'pending'
}
