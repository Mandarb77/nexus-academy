/*
 * Teacher “Preview as student” must be readable on the first `/` render.
 *
 * `toggle` + `navigate('/')` in one click used to hit HomeRoute while the flag was
 * still false, which bounced teachers (and anyone on a shared login) back to
 * `/dashboard` so Workshop never opened.
 */

const KEY = 'nexus:student-preview'

export function readStudentPreviewFlag(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function writeStudentPreviewFlag(on: boolean): void {
  try {
    if (on) sessionStorage.setItem(KEY, '1')
    else sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
