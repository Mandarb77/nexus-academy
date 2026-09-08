/*
 * Bound student/teacher writes so a hung REST call cannot leave a button on
 * “Saving…” forever. Chromebooks, Macs, and ThinkPads all hit this on flaky Wi-Fi.
 */

export const WRITE_TIMEOUT_MS = 12_000

export async function withWriteTimeout<T>(thenable: PromiseLike<T>, ms = WRITE_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      Promise.resolve(thenable),
      new Promise<never>((_, reject) => {
        timer = window.setTimeout(() => {
          reject(new Error('That took too long. Check the network and try again.'))
        }, ms)
      }),
    ])
  } finally {
    if (timer !== undefined) window.clearTimeout(timer)
  }
}
