/*
 * Serialize GoTrue token *refresh* without blocking Google sign-in.
 *
 * Do not fail the in-flight auth call. A 3s reject on getSession made a 504
 * refresh look like “signed out,” which kicked teachers to login and then a
 * student stub hid the dashboard.
 *
 * Steal: if the lock is held, wait briefly then let the next caller run anyway.
 * The previous fn() may still be talking to the network.
 */

let chain: Promise<unknown> = Promise.resolve()

const STEAL_MS = 2_000
const MAX_HOLD_MS = 3_000

export async function serialAuthLock<R>(
  _name: string,
  acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const previous = chain
  chain = previous.then(() => gate)

  const waitMs = acquireTimeout === 0 ? STEAL_MS : Math.max(acquireTimeout, STEAL_MS)
  let acquireTimer: ReturnType<typeof setTimeout> | undefined
  let holdTimer: ReturnType<typeof setTimeout> | undefined
  let released = false
  const releaseOnce = () => {
    if (released) return
    released = true
    release()
  }

  try {
    await Promise.race([
      previous,
      new Promise<void>((resolve) => {
        acquireTimer = setTimeout(resolve, waitMs)
      }),
    ])
    if (acquireTimer) clearTimeout(acquireTimer)
    const work = fn()
    const raced = await Promise.race([
      work.then((value) => ({ done: true as const, value })),
      new Promise<{ done: false }>((resolve) => {
        holdTimer = setTimeout(() => resolve({ done: false }), MAX_HOLD_MS)
      }),
    ])
    if (!raced.done) {
      releaseOnce()
      return await work
    }
    return raced.value
  } finally {
    if (acquireTimer) clearTimeout(acquireTimer)
    if (holdTimer) clearTimeout(holdTimer)
    releaseOnce()
  }
}
