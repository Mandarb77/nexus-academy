/** Turn Cloudflare HTML / fetch failures into a short line for the teacher UI. */
export function supabaseErrorText(message: string): string {
  const m = message.trim()
  if (
    /failed to fetch|networkerror|load failed|timeout|abort|error code 522|522:|<!doctype|cloudflare/i.test(
      m,
    )
  ) {
    return 'the class database timed out. Wait a minute and try again.'
  }
  if (m.length > 160) return `${m.slice(0, 120)}…`
  return m
}
