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
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    if (timeoutMs > 0) {
      await Promise.race([
        previous,
        new Promise<void>((_, reject) => {
          timer = setTimeout(() => {
            reject(new AuthLockTimeoutError(`Auth lock timed out after ${timeoutMs}ms`))
          }, timeoutMs)
        }),
      ])
    } else {
      await previous
    }
    if (timer) clearTimeout(timer)
    held = true
    return await fn()
  } finally {
    if (timer) clearTimeout(timer)
    held = false
    release()
  }
}
