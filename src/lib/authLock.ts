/*
 * Serialize GoTrue token refresh in this tab.
 *
 * School Chromebooks can miss `navigator.locks` (or steal the lock). Then
 * getSession + auto-refresh + React StrictMode all refresh the same token at
 * once, GoTrue revokes it, and the student sees Workshop for a second then login.
 */

class AuthLockTimeoutError extends Error {
  readonly isAcquireTimeout = true
  constructor(message: string) {
    super(message)
    this.name = 'AuthLockTimeoutError'
  }
}

let chain: Promise<unknown> = Promise.resolve()
let held = false

const MAX_HOLD_MS = 8_000

export async function serialAuthLock<R>(
  _name: string,
  acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> {
  if (acquireTimeout === 0 && held) {
    throw new AuthLockTimeoutError('Auth lock is already held')
  }

  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const previous = chain
  chain = previous.then(() => gate)

  const timeoutMs = acquireTimeout > 0 ? acquireTimeout : 0
  let acquireTimer: ReturnType<typeof setTimeout> | undefined
  let holdTimer: ReturnType<typeof setTimeout> | undefined
  try {
    if (timeoutMs > 0) {
      await Promise.race([
        previous,
        new Promise<void>((_, reject) => {
          acquireTimer = setTimeout(() => {
            reject(new AuthLockTimeoutError(`Auth lock timed out after ${timeoutMs}ms`))
          }, timeoutMs)
        }),
      ])
    } else {
      await previous
    }
    if (acquireTimer) clearTimeout(acquireTimer)
    held = true
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
    held = false
    release()
  }
}
