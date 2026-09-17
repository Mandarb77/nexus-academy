/*
 * Interval that skips work when the tab is hidden (Chromebooks left on a page
 * overnight). Optional jitter spreads class-hour polls so they do not hit the
 * database in one wave.
 */

export function pollWhileVisible(
  fn: () => void,
  ms: number,
  options?: { immediate?: boolean; jitterMs?: number },
): () => void {
  let intervalId = 0
  const tick = () => {
    if (document.hidden) return
    fn()
  }
  if (options?.immediate) tick()
  const jitter = Math.max(0, options?.jitterMs ?? 0)
  const startId = window.setTimeout(() => {
    intervalId = window.setInterval(tick, ms)
  }, jitter)
  const onVis = () => {
    if (!document.hidden) fn()
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
