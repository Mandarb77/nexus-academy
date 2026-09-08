/*
 * Serialize GoTrue token *refresh* without blocking Google sign-in.
 *
 * What went wrong in class: supabase-js uses acquireTimeout 0 for some auth
 * calls. Our lock then threw immediately if getSession was already hung, so
 * Sign in with Google became a no-op and the UI said “Google did not open.”
 * Hung REST/Auth 504s also held the lock until the network died, so retries
 * queued behind the same dead request.
 *
 * Rules:
 * - Never fail-closed on contention. Wait a beat, then run anyway.
 * - Never hold the queue for more than MAX_HOLD_MS even if fn() is still
 *   talking to the network.
 */

class AuthLockTimeoutError extends Error {
  readonly isAcquireTimeout = true
  constructor(message: string) {
    super(message)
    this.name = 'AuthLockTimeoutError'
  }
}

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

  try {
    await Promise.race([
      previous,
      new Promise<void>((resolve) => {
        acquireTimer = setTimeout(resolve, waitMs)
      }),
    ])
    if (acquireTimer) clearTimeout(acquireTimer)
    return await Promise.race([
      fn(),
      new Promise<R>((_, reject) => {
        holdTimer = setTimeout(() => {
          reject(new AuthLockTimeoutError(`Auth lock hold timed out after ${MAX_HOLD_MS}ms`))
        }, MAX_HOLD_MS)
      }),
    ])
  } finally {
    if (acquireTimer) clearTimeout(acquireTimer)
    if (holdTimer) clearTimeout(holdTimer)
    release()
  }
}
